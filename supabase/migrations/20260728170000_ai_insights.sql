-- Insights automáticos cross-trade (Fase 4, Módulo 9 real del spec original). No
-- reutiliza ai_analysis: su trade_id not null es intencional (un análisis siempre es
-- de UN trade — ver comentario de esa tabla en 20260701220009_ai_tables.sql), un
-- insight es a nivel de cuenta completa, concepto genuinamente distinto.
create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider_name text not null,
  model_name text not null,
  -- Copia inmutable del contexto agregado usado para generar estos insights, mismo
  -- patrón que ai_analysis.trade_snapshot_at_analysis — permite auditar después
  -- exactamente qué números vio la IA en el momento, aunque las stats cambien luego.
  context_snapshot jsonb not null,
  insights jsonb not null,
  tokens_used integer,
  created_at timestamptz not null default now()
);

create index idx_ai_insights_user on public.ai_insights(user_id, created_at desc);

alter table public.ai_insights enable row level security;

create policy ai_insights_owner_select on public.ai_insights
  for select using (user_id = auth.uid());

-- Insert únicamente vía Edge Function con service_role, nunca directo desde el
-- cliente — mismo patrón que ai_analysis.
grant select on public.ai_insights to authenticated;
grant select, insert on public.ai_insights to service_role;
