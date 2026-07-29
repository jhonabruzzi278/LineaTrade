-- Módulo 5 — win rate por confluencia individual, por combinación exacta de
-- confluencias, y porcentajes psicológicos. security_invoker = true es obligatorio en
-- las tres (regla no negociable de este repo, ver CLAUDE.md → "Views bypass RLS by
-- default"). is_backtest = false también obligatorio en las dos de confluencias
-- (bug real encontrado en auditoría 2026-07-29: trade_confluences hoy solo se puebla
-- desde trades de backtest, así que sin este filtro estas dos vistas — citadas
-- directamente por Insights/Coach — mezclarían práctica con trades reales, violando
-- la regla ya establecida en las otras 4 vistas de este mismo lote).

-- Win rate de cada confluencia individual, sin importar con qué más apareció.
create view public.v_user_stats_by_confluence_single
with (security_invoker = true)
as
select
  tc.user_id,
  ct.id as confluence_type_id,
  ct.name as confluence_name,
  count(*) as total_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(t.pnl_r), 2) as avg_r
from public.trade_confluences tc
join public.trades t on t.id = tc.trade_id
join public.confluence_types ct on ct.id = tc.confluence_type_id
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
group by tc.user_id, ct.id, ct.name;

grant select on public.v_user_stats_by_confluence_single to authenticated;

-- Win rate por SET exacto de confluencias (ej. "Liquidez + FVG + BOS" vs "FVG solo").
-- El having >= 3 sigue la misma regla de "data_sufficiency" que ya usa el motor de IA
-- (ver contextBuilder.ts): sin esto, una combinación que ocurrió una sola vez
-- mostraría "100% win rate", que no es una señal, es ruido con una sola muestra.
create view public.v_user_stats_by_confluence_combo
with (security_invoker = true)
as
select
  combo.user_id,
  combo.confluence_names,
  count(*) as total_trades,
  round(
    count(*) filter (where combo.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(combo.pnl_r), 2) as avg_r
from (
  select
    t.id as trade_id,
    t.user_id,
    t.pnl_amount,
    t.pnl_r,
    array_agg(ct.name order by ct.name) as confluence_names
  from public.trades t
  join public.trade_confluences tc on tc.trade_id = t.id
  join public.confluence_types ct on ct.id = tc.confluence_type_id
  where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
  group by t.id, t.user_id, t.pnl_amount, t.pnl_r
) combo
group by combo.user_id, combo.confluence_names
having count(*) >= 3;

grant select on public.v_user_stats_by_confluence_combo to authenticated;

-- Porcentajes psicológicos del Módulo 5 (FOMO, impulsividad, disciplina, etc.) — usa
-- los 8 campos agregados en 20260728130000_trades_psychology_fields.sql más los que ya
-- existían desde el journal original.
create view public.v_user_psychology_stats
with (security_invoker = true)
as
select
  user_id,
  count(*) as total_trades,
  round(count(*) filter (where had_fomo)::numeric / nullif(count(*), 0) * 100, 2) as pct_fomo,
  round(count(*) filter (where entered_impulsively)::numeric / nullif(count(*), 0) * 100, 2) as pct_impulsive,
  round(count(*) filter (where followed_plan = false)::numeric / nullif(count(*), 0) * 100, 2) as pct_off_plan,
  round(count(*) filter (where followed_plan = true)::numeric / nullif(count(*), 0) * 100, 2) as pct_disciplined,
  round(count(*) filter (where moved_stop_loss)::numeric / nullif(count(*), 0) * 100, 2) as pct_moved_stop,
  round(count(*) filter (where moved_take_profit)::numeric / nullif(count(*), 0) * 100, 2) as pct_moved_tp,
  round(count(*) filter (where revenge_trade)::numeric / nullif(count(*), 0) * 100, 2) as pct_revenge,
  round(count(*) filter (where overtraded)::numeric / nullif(count(*), 0) * 100, 2) as pct_overtraded,
  round(count(*) filter (where hesitated)::numeric / nullif(count(*), 0) * 100, 2) as pct_hesitated,
  round(count(*) filter (where overconfidence)::numeric / nullif(count(*), 0) * 100, 2) as pct_overconfidence,
  round(count(*) filter (where closed_early)::numeric / nullif(count(*), 0) * 100, 2) as pct_closed_early,
  round(count(*) filter (where had_distractions)::numeric / nullif(count(*), 0) * 100, 2) as pct_distractions
from public.trades
where deleted_at is null and status = 'closed' and is_backtest = false
group by user_id;

grant select on public.v_user_psychology_stats to authenticated;
