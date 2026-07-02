-- Estrategias y Reglas del Trader
create table public.strategies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  criteria    jsonb, -- checklist estructurado opcional
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index idx_strategies_user on public.strategies(user_id) where deleted_at is null;

alter table public.strategies enable row level security;
create policy "strategies_owner_all" on public.strategies
  for all using (user_id = auth.uid());

create table public.trader_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index idx_trader_rules_user on public.trader_rules(user_id) where deleted_at is null;

alter table public.trader_rules enable row level security;
create policy "trader_rules_owner_all" on public.trader_rules
  for all using (user_id = auth.uid());
