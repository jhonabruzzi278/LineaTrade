-- Backtesting MVP ("Market Replay"): primera porción, accesible, del plan completo en
-- docs/lineatrade-backtesting-plan.md. Ese doc especifica 9 módulos (replay, dibujo
-- semántico de confluencias, auto-tracking de confluencias, dashboard extendido,
-- gestor de confluencias, motor de patrones); esta migración solo trae lo que hace
-- falta para el núcleo — elegir símbolo/temporalidad, repasar velas históricas reales
-- de Binance, y ejecutar operaciones simuladas que caen en la tabla `trades` real. El
-- sistema de dibujo semántico (confluence_types/chart_annotations/trade_confluences),
-- el dashboard extendido y el motor de patrones quedan deliberadamente fuera — ver
-- CLAUDE.md → "Backtesting (Market Replay)" para el detalle de qué se construyó y qué
-- no, y por qué.

-- 1) backtest_sessions: agrupa una corrida de replay (símbolo/temporalidad/rango). Sin
-- cambios respecto al plan (sección 1.1) — el diseño ya seguía las convenciones de este
-- repo tal cual.
create table public.backtest_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  symbol text not null,
  timeframe text not null,
  provider text not null default 'binance',
  replay_from timestamptz not null,
  replay_to timestamptz not null,
  initial_balance numeric not null default 10000,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.backtest_sessions enable row level security;

create policy backtest_sessions_owner_all on public.backtest_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.backtest_sessions to authenticated;

comment on table public.backtest_sessions is
  'Una corrida de Market Replay. Agrupa las trades ficticias (trades.backtest_session_id) '
  'que produce esa corrida. El sistema de anotaciones de dibujo del plan original '
  '(chart_annotations) todavía no existe — ver CLAUDE.md.';

-- 2) trades: solo is_backtest + backtest_session_id del plan (sección 1.5). Los 8
-- campos psicológicos nuevos (fear_level, anxiety_level, closed_early, etc.) del plan
-- quedan afuera a propósito: nada en el v1 los lee ni los escribe todavía, y agregar
-- columnas que ninguna UI usa viola YAGNI — se suman en la misma migración que
-- construya esa UI, no antes.
alter table public.trades
  add column is_backtest boolean not null default false,
  add column backtest_session_id uuid references public.backtest_sessions(id) on delete set null;

create index trades_backtest_session_idx on public.trades (backtest_session_id)
  where backtest_session_id is not null;

comment on column public.trades.is_backtest is
  'true si esta operación viene de una corrida de Market Replay, no de una operación '
  'real. Todas las vistas agregadas (v_user_trade_stats y las demás) excluyen '
  'is_backtest = true por default — ver más abajo. Una cuenta nueva practicando '
  'backtesting no debería ver su Profit Factor real inflado por operaciones ficticias '
  '(decisión abierta #1 del plan, resuelta acá con el default que el propio plan '
  'recomendaba).';

-- 3) Excluir is_backtest = true de las 4 vistas agregadas existentes que leen `trades`.
-- CREATE OR REPLACE VIEW alcanza porque ninguna cambia su lista de columnas, solo el
-- WHERE — no hace falta DROP. security_invoker = true se repite en las cuatro por las
-- mismas razones ya documentadas en sus migraciones originales (20260702120000,
-- 20260703100000): sin esto la vista correría con los permisos de postgres y
-- filtraría datos de todos los usuarios, ignorando trades_owner_all.

create or replace view public.v_user_trade_stats
with (security_invoker = true)
as
select
  user_id,
  count(*) as total_trades,
  count(*) filter (where status = 'closed') as closed_trades,
  round(
    count(*) filter (where status = 'closed' and pnl_amount > 0)::numeric
    / nullif(count(*) filter (where status = 'closed'), 0) * 100, 2
  ) as win_rate,
  round(
    sum(pnl_amount) filter (where pnl_amount > 0)
    / nullif(abs(sum(pnl_amount) filter (where pnl_amount < 0)), 0), 2
  ) as profit_factor,
  round(avg(pnl_r) filter (where status = 'closed'), 2) as avg_r
from public.trades
where deleted_at is null and is_backtest = false
group by user_id;

create or replace view public.v_user_stats_by_strategy
with (security_invoker = true)
as
select
  t.user_id,
  s.name as strategy_name,
  count(*) as trade_count,
  round(count(*) filter (where t.pnl_amount > 0)::numeric / nullif(count(*), 0) * 100, 2) as win_rate
from public.trades t
join public.strategies s on s.id = t.strategy_id
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
group by t.user_id, s.name;

create or replace view public.v_user_stats_by_emotion
with (security_invoker = true)
as
select
  user_id,
  emotion,
  count(*) as trade_count,
  round(count(*) filter (where pnl_amount > 0)::numeric / nullif(count(*), 0) * 100, 2) as win_rate
from public.trades
where deleted_at is null and status = 'closed' and emotion is not null and is_backtest = false
group by user_id, emotion;

create or replace view public.v_rule_violations
with (security_invoker = true)
as
select
  t.user_id,
  'stop_loss_moved' as rule_flag,
  count(*) filter (where th.field_name = 'stop_loss') as objective_count,
  count(*) filter (where t.moved_stop_loss = true) as self_reported_count
from public.trades t
left join public.trade_history th on th.trade_id = t.id
where t.deleted_at is null and t.is_backtest = false
group by t.user_id;
