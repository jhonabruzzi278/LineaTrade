-- Objetivos
create table public.objectives (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  metric_type   text not null, -- 'win_rate' | 'profit_factor' | 'r_avg' | 'custom'
  target_value  numeric not null,
  current_value numeric default 0,
  period_start  date,
  period_end    date,
  achieved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_objectives_user on public.objectives(user_id) where deleted_at is null;

alter table public.objectives enable row level security;
create policy "objectives_owner_all" on public.objectives
  for all using (user_id = auth.uid());
