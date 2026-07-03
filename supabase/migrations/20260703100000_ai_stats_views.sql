-- Fase 3 (Motor de IA) — vistas agregadas que faltaban del context-engine doc §2.
-- security_invoker = true es obligatorio en las tres (mismo motivo que
-- 20260702120000_user_trade_stats_view.sql): sin esto, la vista corre con los
-- permisos de su dueño y filtraría datos de TODOS los usuarios a quien la
-- consulte, ignorando trades_owner_all.

create view public.v_user_stats_by_strategy
with (security_invoker = true)
as
select
  t.user_id,
  s.name as strategy_name,
  count(*) as trade_count,
  round(count(*) filter (where t.pnl_amount > 0)::numeric / nullif(count(*), 0) * 100, 2) as win_rate
from public.trades t
join public.strategies s on s.id = t.strategy_id
where t.deleted_at is null and t.status = 'closed'
group by t.user_id, s.name;

grant select on public.v_user_stats_by_strategy to authenticated;

create view public.v_user_stats_by_emotion
with (security_invoker = true)
as
select
  user_id,
  emotion,
  count(*) as trade_count,
  round(count(*) filter (where pnl_amount > 0)::numeric / nullif(count(*), 0) * 100, 2) as win_rate
from public.trades
where deleted_at is null and status = 'closed' and emotion is not null
group by user_id, emotion;

grant select on public.v_user_stats_by_emotion to authenticated;

-- Reglas incumplidas: cruza el autoreporte (moved_stop_loss) con la evidencia
-- objetiva de trade_history. Solo cubre el flag stop_loss_moved para Fase 3 —
-- no se construye un motor genérico de reglas que la UI no puede poblar todavía
-- (trader_rules.title no se referencia cruzadamente desde ningún trade hoy).
create view public.v_rule_violations
with (security_invoker = true)
as
select
  t.user_id,
  'stop_loss_moved' as rule_flag,
  count(*) filter (where th.field_name = 'stop_loss') as objective_count,
  count(*) filter (where t.moved_stop_loss = true) as self_reported_count
from public.trades t
left join public.trade_history th on th.trade_id = t.id
where t.deleted_at is null
group by t.user_id;

grant select on public.v_rule_violations to authenticated;

-- Deliberadamente NO se agrega v_user_stats_30d (ventana de 30 días) del doc.
-- El producto es nuevo (pocos trades por usuario todavía); una ventana de 30
-- días colapsaría data_sufficiency a 'insufficient' para casi todos los
-- usuarios reales, defeando el propósito del análisis para early adopters.
-- Fase 3 usa v_user_trade_stats (todo el historial, ya existe, ya verificada
-- con security_invoker=true) para aggregate_stats. Revisar v_user_stats_30d
-- cuando el producto tenga antigüedad de datos suficiente (v1.5+).
