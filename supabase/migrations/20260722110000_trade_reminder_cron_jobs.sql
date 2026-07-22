-- Programa 2 jobs pg_cron/día que invocan send-trade-reminders (recordatorio
-- push "¿ya registraste tu trade de hoy?") con header X-Cron-Secret, mismo
-- esqueleto que invoke_news_cron_refresh() en 20260721130000_news_cron_jobs.sql
-- (mismo motivo para no resolver DST por migración: aceptamos el desfasaje de
-- 1h en horario de verano en vez de mantener dos migraciones por cada cambio).
--
-- A diferencia de las noticias (mercado US, lunes-viernes), este journal
-- también cubre forex/cripto (24/7) — corre TODOS los días, no solo
-- lunes-viernes.
--
-- Horarios elegidos para cubrir la ventana horaria de la audiencia LatAm del
-- producto (UTC-3 a UTC-6) con dos avisos, uno de tarde y uno de noche:
--   Aviso 1 (tarde) : 20:00 UTC = 14-17h local según el país (México a
--                      Argentina) — cerca del cierre del mercado US (21:00
--                      UTC std, ver news cron) para el trader de acciones/
--                      opciones que ya cerró su sesión del día.
--   Aviso 2 (noche) : 23:30 UTC = 17:30-20:30h local — segundo aviso para
--                      quien no vio el primero, y para forex/cripto que
--                      opera fuera del horario de mercado US.
-- Son valores de arranque razonables, no una decisión de producto grabada en
-- piedra — ajustar el 'schedule' de cron.schedule() de abajo si hace falta
-- otro horario (formato estándar cron, en UTC).
--
-- Requiere: pg_cron + pg_net (mismas extensions que la migración de noticias,
-- ya habilitadas por esa migración si corrió antes; create extension if not
-- exists las vuelve a declarar acá por si esta migración corre sola/primero
-- en otro entorno). El secret 'trade_reminder_cron_secret' se crea en Vault
-- antes de pushear esta migración:
--   select vault.create_secret('<random-32-bytes-hex>', 'trade_reminder_cron_secret');
-- Reusa los secrets 'project_url' y 'publishable_key' ya creados para el cron
-- de noticias (son de propósito general, no específicos de esa feature). El
-- secret debe matchear Deno.env.get('TRADE_REMINDER_CRON_SECRET') en la Edge
-- Function — setear vía `supabase secrets set TRADE_REMINDER_CRON_SECRET=...`,
-- nunca hardcodeado acá.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_trade_reminder_cron()
returns void
language plpgsql
security definer
as $$
declare
  project_url text;
  anon_key    text;
  cron_secret text;
begin
  select decrypted_secret into project_url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into anon_key    from vault.decrypted_secrets where name = 'publishable_key';
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'trade_reminder_cron_secret';

  if project_url is null or anon_key is null or cron_secret is null then
    raise warning 'invoke_trade_reminder_cron: faltan secrets en vault (project_url / publishable_key / trade_reminder_cron_secret)';
    return;
  end if;

  -- pg_net es async: el request_id se devuelve pero no esperamos respuesta.
  perform net.http_post(
    url := project_url || '/functions/v1/send-trade-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'X-Cron-Secret', cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

grant execute on function public.invoke_trade_reminder_cron() to postgres;

select cron.schedule('trade-reminder-afternoon', '0 20 * * *',  $$ select public.invoke_trade_reminder_cron(); $$);
select cron.schedule('trade-reminder-evening',   '30 23 * * *', $$ select public.invoke_trade_reminder_cron(); $$);
