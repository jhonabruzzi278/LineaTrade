-- Detalle de ticket de orden del broker (número de orden, hora de colocación
-- vs. ejecución, tipo Market/Limit, bid/ask al momento de operar, term,
-- all-or-none). Un trade en LineaTrade es una sola fila que se abre y se
-- cierra en el mismo registro (ver "Cerrar trade" en TradeDetail), pero un
-- broker real genera DOS órdenes (apertura y cierre) — de ahí la tabla aparte
-- en vez de duplicar cada campo con sufijo _entry/_exit en trades. Mismo
-- patrón de RLS que trade_threads: user_id denormalizado en la fila, no un
-- exists() contra trades.
create table public.trade_orders (
  id                uuid primary key default gen_random_uuid(),
  trade_id          uuid not null references public.trades(id) on delete cascade,
  user_id           uuid not null references public.profiles(id),
  leg               text not null check (leg in ('open', 'close')),
  order_number      text,
  order_placed_at   timestamptz,
  price_type        text check (price_type in ('market', 'limit')),
  limit_price       numeric,
  bid_price         numeric,
  ask_price         numeric,
  term              text,
  all_or_none       boolean not null default false,
  created_at        timestamptz not null default now(),
  constraint uq_trade_orders_trade_leg unique (trade_id, leg)
);

create index idx_trade_orders_trade on public.trade_orders(trade_id);

alter table public.trade_orders enable row level security;
create policy "trade_orders_owner_all" on public.trade_orders
  for all using (user_id = auth.uid());

grant select, insert, update, delete on public.trade_orders to authenticated;
