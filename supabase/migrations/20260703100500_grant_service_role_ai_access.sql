-- Fase 3 (Motor de IA) — hallazgo real durante la implementación del Edge
-- Function: "service_role" tiene rolbypassrls=true (bypassa RLS), pero NO
-- rolsuper — y en este proyecto nunca se le otorgó ningún GRANT de tabla
-- explícito (20260701223500_grant_authenticated_privileges.sql solo le dio
-- select/insert/update/delete a "authenticated"). Mismo principio que ese
-- mismo archivo ya documenta: RLS solo filtra FILAS, bypassrls solo salta esa
-- capa — sin el GRANT de tabla, Postgres deniega el acceso antes de siquiera
-- llegar a evaluar RLS. No causó problemas antes porque ningún Edge Function
-- (ni nada que use la service_role key) existía en este proyecto hasta ahora.
--
-- Se otorga selectivamente, solo lo que analyze-trade necesita — no un grant
-- amplio a todas las tablas:
grant select on public.ai_provider_config to service_role;
grant select on public.user_ai_settings to service_role;
grant insert on public.ai_analysis to service_role;
