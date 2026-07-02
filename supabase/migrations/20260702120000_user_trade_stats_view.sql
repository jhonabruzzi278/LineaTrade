-- Estadísticas agregadas para el Dashboard. "El backend calcula, nunca el cliente" —
-- ver docs/trade-journal-os-context-engine.md §2 (mismo espíritu que v_user_stats_30d,
-- aquí en versión "todo el historial" ya que una cuenta nueva no tendría datos en una
-- ventana de 30 días).
--
-- security_invoker = true es obligatorio: sin esto, la vista corre con los permisos de
-- su dueño (postgres) y filtraría las estadísticas de TODOS los usuarios a cualquiera
-- que la consulte, ignorando la política trades_owner_all. Con security_invoker, la
-- vista respeta la RLS de trades para quien la está consultando.
create view public.v_user_trade_stats
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
where deleted_at is null
group by user_id;

grant select on public.v_user_trade_stats to authenticated;
