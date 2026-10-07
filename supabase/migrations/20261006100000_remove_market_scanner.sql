-- El Market Scanner se elimina del producto (decisión del 2026-10-06, junto con
-- Backtesting). Esta migración retira todo lo que el scanner tenía corriendo o
-- reservado en el servidor:
--
-- 1. El cron 'market-scanner' (cada 5 minutos contra Binance) y su función.
-- 2. scanner_results: snapshot de datos públicos de mercado, sin datos de usuarios.
-- 3. La cuota 'scanner_queries' de los planes.
-- 4. Las entradas del scanner en el monitoreo de cron del panel de admin, para que
--    /admin no muestre como "faltante" un job que ya no debe existir.
--
-- Los datos de práctica de los usuarios (backtest_sessions, trades.is_backtest,
-- chart_annotations, trade_confluences, confluence_types) NO se tocan acá: borrarlos
-- es irreversible y queda como decisión aparte.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'market-scanner') then
    perform cron.unschedule('market-scanner');
  end if;
end;
$$;

drop function if exists public.invoke_scanner_cron();

drop table if exists public.scanner_results;

delete from public.user_entitlement_overrides where feature_key = 'scanner_queries';
delete from public.plan_entitlements where feature_key = 'scanner_queries';

create or replace function public.get_cron_job_health()
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

create or replace function public.get_cron_secrets_status()
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
