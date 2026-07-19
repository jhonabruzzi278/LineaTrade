-- Mismo hallazgo que 20260703100500_grant_service_role_ai_access.sql:
-- service_role tiene bypassrls=true pero no rolsuper, y nunca recibe GRANT de
-- tabla automáticamente. fetch-news usa serviceClient para leer/escribir
-- news_articles (upsert de los feeds + lectura del listado) — sin esto,
-- Postgres devuelve "permission denied for table news_articles" antes de
-- siquiera llegar a evaluar RLS.
grant select, insert, update on public.news_articles to service_role;
