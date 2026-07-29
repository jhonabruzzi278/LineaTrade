-- get_cron_job_health()/get_cron_secrets_status() (20260727100000) enumeran los cron
-- jobs/secrets conocidos con una lista fija — 'market-scanner' (agregado recién en
-- 20260728190000_scanner_cron_job.sql) y 'scanner_cron_secret' no estaban en esa
-- lista porque esta migración no existía todavía cuando se escribió la extensión del
-- admin panel. Bug real encontrado en auditoría 2026-07-29: sin este fix, si el Vault
-- secret del scanner falta o el cron falla, el job "no-opea" en silencio (mismo
-- patrón raise-warning-y-return que ya afectó a noticias/recordatorios) y el panel de
-- superadmin no muestra nada anormal, porque ni siquiera sabe que este cron existe —
-- exactamente el incidente que estas dos funciones se crearon para prevenir.
-- Mismo contrato de seguridad que las funciones originales (security definer +
-- is_superadmin + audit_log), Postgres permite CREATE OR REPLACE acá porque ninguna
-- columna del RETURNS TABLE cambió.

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
    'trade-reminder-afternoon', 'trade-reminder-evening', 'market-scanner'
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
    ('trade_reminder_cron_secret'),
    ('scanner_cron_secret')
  ) as s(name)
  left join vault.decrypted_secrets v on v.name = s.name
  order by s.name;
end;
$$;
