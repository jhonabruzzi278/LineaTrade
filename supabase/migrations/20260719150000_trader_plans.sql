-- "Convierte la IA en tu trader" — snapshot inmutable del plan calculado por
-- computeTraderPlan() (función pura en el cliente, sin LLM de por medio). Cada
-- "rehacer test" inserta una fila nueva en vez de actualizar la existente
-- (mismo criterio que ai_analysis): la UI lee la más reciente por created_at
-- y conserva histórico. RLS de owner directo, sin security definer ni vista:
-- es dato propio del usuario, calculado e insertado por el propio cliente
-- (no por un Edge Function con service_role), así que solo hace falta el
-- grant a "authenticated".
create table public.trader_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  answers    jsonb not null,
  plan       jsonb not null,
  created_at timestamptz not null default now()
);

create index idx_trader_plans_user on public.trader_plans(user_id, created_at desc);

alter table public.trader_plans enable row level security;
create policy "trader_plans_owner_all" on public.trader_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.trader_plans to authenticated;
