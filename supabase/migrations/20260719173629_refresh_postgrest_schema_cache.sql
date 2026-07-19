-- Fuerza el refresh del schema cache de PostgREST despues de aplicar
-- migraciones via MCP (apply_migration), que no invalida el cache
-- automaticamente como lo hace supabase db push.
comment on table public.news_articles is 'Feed de noticias de trading';
comment on table public.trader_plans is 'Planes de trading generados por IA Trader';
