-- BUG REAL #2 (descubierto en la misma sesión que la recursión de RLS): Supabase ya
-- no auto-expone tablas nuevas a los roles de la Data API (anon/authenticated/
-- service_role) — es el nuevo comportamiento por defecto, tanto en cloud como local
-- (ver `auto_expose_new_tables` en supabase/config.toml). El schema original asumía
-- que RLS bastaba, pero RLS solo filtra FILAS; sin el GRANT a nivel de tabla, Postgres
-- rechaza la operación antes de evaluar cualquier policy ("permission denied for table").
--
-- Es seguro otorgar CRUD amplio aquí porque las policies de cada tabla siguen siendo
-- la restricción real: donde no existe policy para una operación (ej. insert en
-- trade_history, ai_analysis, audit_log — todas de solo lectura/trigger/Edge Function),
-- el GRANT de tabla no la habilita igual. GRANT es la puerta de entrada; POLICY decide
-- qué filas y qué operaciones quedan realmente permitidas.
--
-- No se otorga nada a "anon": el producto no tiene superficie pública (sin redes
-- sociales, sin datos compartidos) — todo requiere sesión.
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  public.profiles,
  public.instruments,
  public.strategies,
  public.trader_rules,
  public.trades,
  public.trade_history,
  public.trade_images,
  public.trade_threads,
  public.objectives,
  public.ai_provider_config,
  public.user_ai_settings,
  public.ai_usage_daily,
  public.ai_prompts,
  public.ai_analysis,
  public.audit_log
to authenticated;
