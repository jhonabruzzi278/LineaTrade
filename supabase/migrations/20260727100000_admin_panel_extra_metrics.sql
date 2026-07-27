-- Amplia el panel de superadmin (`/admin`) con dos categorias que hoy no
-- cubre ninguna metrica: (1) adopcion de las features "Beyond Fase 4"
-- (noticias, IA Trader, push, Sistema, opciones, BYOK) y (2) salud de los
-- cron jobs de pg_cron/pg_net. La (2) existe porque ya hubo DOS incidentes
-- reales de un cron corriendo "en verde" mientras no hacia nada util —
-- invoke_news_cron_refresh() y invoke_trade_reminder_cron() (ver
-- 20260721130000_news_cron_jobs.sql / 20260722110000_trade_reminder_cron_jobs.sql)
-- solo hacen `raise warning` y `return` si faltan los secrets de Vault, sin
-- lanzar una excepcion — asi que cron.job_run_details.status muestra
-- 'succeeded' igual, aunque el POST real nunca haya salido. Por eso
-- get_cron_job_health() no alcanza sola: se complementa con
-- get_cron_secrets_status(), que chequea la EXISTENCIA de los secrets
-- (nunca su valor) directo en Vault, la señal que de verdad hubiera
-- detectado ambos incidentes antes.

-- 1) get_system_metrics(): Postgres no permite CREATE OR REPLACE cuando
-- cambia la lista de columnas de un RETURNS TABLE, asi que hace falta
-- DROP + CREATE. Mismo contrato de seguridad que el original
-- (20260704090000): security definer + is_superadmin + audit_log antes de
-- devolver datos. Todas las columnas nuevas son conteos/agregados de TODO
-- el sistema, ninguna trae user_id ni nada identificable — misma categoria
-- que ya justifico saltarse la Edge Function auditada de v1.1.
drop function if exists public.get_system_metrics();

create function public.get_system_metrics()
returns table (
  total_users bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  new_users_7d bigint,
  total_trades bigint,
  open_trades bigint,
  closed_trades bigint,
  trades_7d bigint,
  options_trades_total bigint,
  total_ai_analyses bigint,
  ai_analyses_7d bigint,
  ai_tokens_used_7d bigint,
  users_hit_daily_limit_today bigint,
  byok_users bigint,
  default_ai_provider text,
  default_ai_model text,
  total_news_articles bigint,
  news_latest_fetched_at timestamptz,
  trader_plans_total bigint,
  trader_plans_unique_users bigint,
  push_subscriptions_total bigint,
  total_objectives bigint,
  active_trader_rules bigint,
  active_strategies bigint,
  generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  insert into public.audit_log (user_id, action, entity_type)
  values (auth.uid(), 'view_system_metrics', 'system_metrics');

  return query
  select
    (select count(*) from public.profiles where deleted_at is null),
    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    (select count(*) from public.trades where deleted_at is null),
    (select count(*) from public.trades where deleted_at is null and status = 'open'),
    (select count(*) from public.trades where deleted_at is null and status = 'closed'),
    (select count(*) from public.trades where deleted_at is null and traded_at > now() - interval '7 days'),
    (select count(*) from public.trades where deleted_at is null and option_type is not null),
    (select count(*) from public.ai_analysis),
    (select count(*) from public.ai_analysis where created_at > now() - interval '7 days'),
    (select coalesce(sum(tokens_used), 0) from public.ai_usage_daily where usage_date >= current_date - 7),
    (select count(*) from public.ai_usage_daily where usage_date = current_date and requests_count >= 3),
    (select count(*) from public.user_ai_settings where use_own_key),
    (select provider_name from public.ai_provider_config where is_default and is_active limit 1),
    (select model_name from public.ai_provider_config where is_default and is_active limit 1),
    (select count(*) from public.news_articles),
    (select max(fetched_at) from public.news_articles),
    (select count(*) from public.trader_plans),
    (select count(distinct user_id) from public.trader_plans),
    (select count(*) from public.push_subscriptions),
    (select count(*) from public.objectives where deleted_at is null),
    (select count(*) from public.trader_rules where deleted_at is null and is_active),
    (select count(*) from public.strategies where deleted_at is null and is_active),
    now();
end;
$$;

revoke all on function public.get_system_metrics() from public;
grant execute on function public.get_system_metrics() to authenticated;

-- 2) get_cron_job_health(): ultimo run de cada uno de los 6 jobs conocidos
-- (4 de noticias + 2 de recordatorio push), leyendo cron.job/cron.job_run_details
-- directo — igual que la propia UI de "Cron Jobs" del dashboard de Supabase.
-- El owner de la funcion (misma cuenta que corre las migraciones) ya tiene
-- los privilegios sobre el schema `cron` porque es quien corrio
-- cron.schedule(...) en las dos migraciones de arriba.
create function public.get_cron_job_health()
returns table (
  job_name text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_run_status text,
  last_run_message text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  insert into public.audit_log (user_id, action, entity_type)
  values (auth.uid(), 'view_cron_job_health', 'cron_job_health');

  return query
  select
    j.jobname,
    j.schedule,
    j.active,
    r.start_time,
    r.status,
    r.return_message
  from cron.job j
  left join lateral (
    select d.start_time, d.status, d.return_message
    from cron.job_run_details d
    where d.jobid = j.jobid
    order by d.start_time desc
    limit 1
  ) r on true
  where j.jobname in (
    'news-premarket', 'market-open', 'market-close', 'post-close',
    'trade-reminder-afternoon', 'trade-reminder-evening'
  )
  order by j.jobname;
end;
$$;

revoke all on function public.get_cron_job_health() from public;
grant execute on function public.get_cron_job_health() to authenticated;

-- 3) get_cron_secrets_status(): chequea SOLO la existencia (nunca el valor)
-- de los 4 secrets de Vault que invoke_news_cron_refresh() /
-- invoke_trade_reminder_cron() necesitan para efectivamente disparar el
-- POST — la señal que hubiera detectado los dos incidentes reales descritos
-- arriba antes de una sesion de debugging manual. Nunca selecciona
-- decrypted_secret, solo v.name, para no exponer material sensible ni
-- indirectamente al panel.
create function public.get_cron_secrets_status()
returns table (
  secret_name text,
  is_configured boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  insert into public.audit_log (user_id, action, entity_type)
  values (auth.uid(), 'view_cron_secrets_status', 'cron_secrets_status');

  return query
  select s.name, (v.name is not null) as is_configured
  from (values
    ('project_url'),
    ('publishable_key'),
    ('news_cron_secret'),
    ('trade_reminder_cron_secret')
  ) as s(name)
  left join vault.decrypted_secrets v on v.name = s.name
  order by s.name;
end;
$$;

revoke all on function public.get_cron_secrets_status() from public;
grant execute on function public.get_cron_secrets_status() to authenticated;
