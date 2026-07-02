-- Hilos de Seguimiento (Threads)
create table public.trade_threads (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades(id) on delete cascade,
  user_id      uuid not null references public.profiles(id),
  parent_id    uuid references public.trade_threads(id), -- respuestas anidadas
  content      text not null,
  ai_generated boolean not null default false,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index idx_trade_threads_trade on public.trade_threads(trade_id, created_at) where deleted_at is null;

alter table public.trade_threads enable row level security;
create policy "trade_threads_owner_all" on public.trade_threads
  for all using (user_id = auth.uid());
