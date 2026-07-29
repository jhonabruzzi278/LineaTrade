-- Tabla puente — qué confluencias tenía una operación. Población 100% automática
-- (Módulo 3: nunca se escribe a mano, ver src/lib/backtestTrades.ts): al abrir/cerrar
-- una trade de backtest, el frontend copia acá las confluence_type_id de todas las
-- chart_annotations visibles hasta la vela actual.
create table public.trade_confluences (
  trade_id uuid not null references public.trades(id) on delete cascade,
  confluence_type_id uuid not null references public.confluence_types(id) on delete restrict,
  -- Denormalizado a propósito, mismo patrón que trade_orders/trade_threads (ver
  -- CLAUDE.md "Options trading & order tickets") — evita un join a trades solo para
  -- resolver el dueño en cada policy.
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trade_id, confluence_type_id)
);

alter table public.trade_confluences enable row level security;

create policy trade_confluences_owner_all on public.trade_confluences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.trade_confluences to authenticated;

comment on table public.trade_confluences is
  'Confluencias detectadas para una operación, siempre poblada por código (nunca a '
  'mano) a partir de chart_annotations. Base de las vistas de win rate por confluencia '
  '(v_user_stats_by_confluence_single/combo).';
