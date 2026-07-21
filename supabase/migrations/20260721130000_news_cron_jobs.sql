-- Programa 4 jobs pg_cron que invocan fetch-news con header X-Cron-Secret en
-- horarios clave de mercado US (Eastern Time = UTC-5std / UTC-4 EDT; usamos
-- UTC fijo y actualizamos dos veces al año si hace falta — o cron dice "13:25
-- UTC" y el cron job corre en horario del servidor que es UTC por defecto en
-- Supabase Cloud):
--   Pre-market brief : 08:25 ET  = 13:25 UTC (std)  / 12:25 UTC (DST)
--   Market open      : 09:30 ET  = 14:30 UTC (std)  / 13:30 UTC (DST)
--   Market close     : 16:00 ET  = 21:00 UTC (std)  / 20:00 UTC (DST)
--   Post-close wrap  : 16:30 ET  = 21:30 UTC (std)  / 20:30 UTC (DST)
--
-- Tomamos los horarios STD (UTC-5). En EDT los jobs corren 1h tarde — acepto
-- ese desfasaje porque no quiero mantener dos migraciones cada cambio DST y
-- porque el cache on-demand de fetch-news (STALE_MS=25min) cubre la brecha
-- para cualquier usuario que abra la app fuera del schedule exacto.
--
-- Requiere: pg_cron + pg_net extensions habilitadas en el proyecto cloud. En
-- local Docker ya están disponibles (config.toml las lista). El secret
-- NEWS_CRON_SECRET lo seteamos via Vault desde el dashboard o CLI; acá lo
-- leemos de vault.decrypted_secrets (mismo patrón que project_url en
-- automatic-embeddings docs). El deploy script debe crear el secret antes
-- de pushear esta migración:
--   select vault.create_secret('<random-32-bytes-hex>', 'news_cron_secret');
-- También debe existir el secret 'project_url' con la URL del proyecto
-- (https://<project-ref>.supabase.co) y 'publishable_key' con un anon key
-- válido. Estos tres secrets viven en Vault y nunca en el repositorio.
--
-- El secret 'news_cron_secret' debe matchear Deno.env.get('NEWS_CRON_SECRET')
-- en la Edge Function — setear via `supabase secrets set NEWS_CRON_SECRET=...`
-- No hardcodear acá — Vault es la fuente de verdad.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Helper: invoca fetch-news con X-Cron-Secret desde vault. Lo dejamos como
-- función SQL reutilizable para que los 4 schedules sean simplemente llamadas
-- a la misma función, sin duplicar el SQL del POST en cada job.
create or replace function public.invoke_news_cron_refresh()
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
  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'news_cron_secret';

  if project_url is null or anon_key is null or cron_secret is null then
    raise warning 'invoke_news_cron_refresh: faltan secrets en vault (project_url / publishable_key / news_cron_secret)';
    return;
  end if;

  -- POST vacío (fetch-news no usa body) con Authorization + X-Cron-Secret.
  -- pg_net es async: el request_id se devuelve pero no esperamos respuesta.
  perform net.http_post(
    url := project_url || '/functions/v1/fetch-news',
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

grant execute on function public.invoke_news_cron_refresh() to postgres;

-- 4 jobs en horarios STD UTC. Lunes a Viernes (1-5 en cron). Fin de semana
-- el mercado está cerrado, no tiene sentido gastar requests.
select cron.schedule('news-premarket', '25 13 * * 1-5', $$ select public.invoke_news_cron_refresh(); $$);
select cron.schedule('market-open',    '30 14 * * 1-5', $$ select public.invoke_news_cron_refresh(); $$);
select cron.schedule('market-close',   '0 21 * * 1-5',  $$ select public.invoke_news_cron_refresh(); $$);
select cron.schedule('post-close',     '30 21 * * 1-5', $$ select public.invoke_news_cron_refresh(); $$);