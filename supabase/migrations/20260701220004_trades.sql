-- Trades (núcleo del sistema)
create type trade_side as enum ('long', 'short');
create type trade_status as enum ('open', 'closed');

create table public.trades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  instrument_id    uuid not null references public.instruments(id),
  strategy_id      uuid references public.strategies(id),
  side             trade_side not null,
  status           trade_status not null default 'open',

  -- Información general
  traded_at        timestamptz not null,
  timeframe        text,

  -- Datos técnicos
  entry_price      numeric not null,
  exit_price       numeric,
  stop_loss        numeric,
  take_profit      numeric,
  risk_percent     numeric,
  position_size    numeric,
  pnl_amount       numeric,
  pnl_r            numeric,
  commission       numeric default 0,
  duration_minutes integer,

  -- Contexto
  context_before   text,
  entry_reason     text,
  confirmations    text,
  context_during   text,
  management_notes text,
  context_after    text,
  reflection       text,

  -- Psicología (autoreportado)
  emotion          text,
  confidence_level smallint check (confidence_level between 1 and 10),
  stress_level     smallint check (stress_level between 1 and 10),
  followed_plan    boolean,
  had_fomo         boolean,
  overtraded       boolean,
  moved_stop_loss  boolean, -- autoreporte; el dato OBJETIVO vive en trade_history
  revenge_trade    boolean,

  -- Aprendizaje
  main_mistake     text,
  what_to_repeat   text,
  what_to_avoid    text,
  lesson_learned   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  constraint chk_closed_has_exit check (
    status = 'open' or (status = 'closed' and exit_price is not null)
  )
);

create index idx_trades_user_date on public.trades(user_id, traded_at desc) where deleted_at is null;
create index idx_trades_user_instrument on public.trades(user_id, instrument_id) where deleted_at is null;
create index idx_trades_user_strategy on public.trades(user_id, strategy_id) where deleted_at is null;
create index idx_trades_status on public.trades(user_id, status) where deleted_at is null;

alter table public.trades enable row level security;

create policy "trades_owner_all" on public.trades
  for all using (user_id = auth.uid());

-- Soporte: superadmin lee (nunca escribe) trades ajenos, siempre queda auditado (ver audit_log)
create policy "trades_select_superadmin" on public.trades
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
