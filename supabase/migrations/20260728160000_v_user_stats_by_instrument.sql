-- Vista faltante para el motor de insights (Fase 4): ninguna vista existente desglosa
-- por instrumento — sin esto, ejemplos del spec original como "tu mejor activo es
-- XAUUSD" son imposibles de generar. security_invoker = true obligatorio (ver
-- CLAUDE.md → "Views bypass RLS by default").
create view public.v_user_stats_by_instrument
with (security_invoker = true)
as
select
  t.user_id,
  i.symbol,
  count(*) as total_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(t.pnl_r), 2) as avg_r,
  round(sum(t.pnl_amount), 2) as net_pnl
from public.trades t
join public.instruments i on i.id = t.instrument_id
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
group by t.user_id, i.symbol;

grant select on public.v_user_stats_by_instrument to authenticated;
