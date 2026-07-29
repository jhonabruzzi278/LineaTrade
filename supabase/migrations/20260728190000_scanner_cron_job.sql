-- Programa el cron del escáner de mercado — mismo esqueleto exacto que
-- invoke_trade_reminder_cron() (20260722110000_trade_reminder_cron_jobs.sql): Vault
-- para los secrets, pg_net para la llamada async, X-Cron-Secret para que run-scanner
-- sepa que la invocación es del cron interno y no de un cliente cualquiera.
--
-- Cada 5 minutos — cripto opera 24/7, no hay "horario de mercado" que respetar como
-- en el cron de noticias (lunes-viernes, horarios US). 5 minutos es un punto de
-- partida razonable (no una decisión de producto grabada en piedra): suficientemente
-- fresco para un escáner de "qué está pasando ahora", sin generar carga innecesaria
-- contra la API de Binance corriendo cada minuto.
--
-- Requiere, antes de pushear esta migración:
--   select vault.create_secret('<random-32-bytes-hex>', 'scanner_cron_secret');
-- Reusa 'project_url' y 'publishable_key' ya creados para los crons de
-- noticias/recordatorios (son de propósito general). El secret debe matchear
-- Deno.env.get('SCANNER_CRON_SECRET') en la Edge Function — setear vía
-- `supabase secrets set SCANNER_CRON_SECRET=...`, nunca hardcodeado acá.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.invoke_scanner_cron()
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
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'scanner_cron_secret';

  if project_url is null or anon_key is null or cron_secret is null then
    raise warning 'invoke_scanner_cron: faltan secrets en vault (project_url / publishable_key / scanner_cron_secret)';
    return;
  end if;

  -- timeout_milliseconds más alto que los otros crons: run-scanner recorre ~150
  -- símbolos con klines individuales, una corrida real tarda más que "publicar un
  -- puñado de notificaciones push" o "refrescar unos feeds RSS".
  perform net.http_post(
    url := project_url || '/functions/v1/run-scanner',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'X-Cron-Secret', cron_secret
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 180000
  );
end;
$$;

grant execute on function public.invoke_scanner_cron() to postgres;

select cron.schedule('market-scanner', '*/5 * * * *', $$ select public.invoke_scanner_cron(); $$);
