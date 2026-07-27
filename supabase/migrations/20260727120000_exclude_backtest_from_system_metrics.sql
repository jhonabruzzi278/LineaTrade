-- Bug real encontrado por el agente code-reviewer al revisar 20260727110000
-- (backtesting MVP): get_system_metrics() (20260704090000, extendida en
-- 20260727100000) cuenta total_trades/open_trades/closed_trades/trades_7d sobre
-- TODA la tabla trades, sin excluir is_backtest — a diferencia de las 4 vistas
-- agregadas que 20260727110000 sí corrigió. Como get_system_metrics() es una
-- función plpgsql, no una de esas vistas, nada en esa migración la tocó. Practicar
-- en /backtesting infla "Trades totales"/"Abiertos"/"Cerrados"/"Últimos 7 días" en
-- el panel de superadmin.
--
-- CREATE OR REPLACE alcanza acá (a diferencia de 20260727100000, que necesitó
-- DROP + CREATE): la lista de columnas de retorno no cambia, solo el WHERE de
-- cuatro subqueries.
create or replace function public.get_system_metrics()
returns table (
  total_users bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  new_users_7d bigint,
  total_trades bigint,
  open_trades bigint,
  closed_trades bigint,
  trades_7d bigint,
  options_trades_total bigint,
  total_ai_analyses bigint,
  ai_analyses_7d bigint,
  ai_tokens_used_7d bigint,
  users_hit_daily_limit_today bigint,
  byok_users bigint,
  default_ai_provider text,
  default_ai_model text,
  total_news_articles bigint,
  news_latest_fetched_at timestamptz,
  trader_plans_total bigint,
  trader_plans_unique_users bigint,
  push_subscriptions_total bigint,
  total_objectives bigint,
  active_trader_rules bigint,
  active_strategies bigint,
  generated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  insert into public.audit_log (user_id, action, entity_type)
  values (auth.uid(), 'view_system_metrics', 'system_metrics');

  return query
  select
    (select count(*) from public.profiles where deleted_at is null),
    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    (select count(*) from auth.users where last_sign_in_at > now() - interval '30 days'),
    (select count(*) from public.profiles where deleted_at is null and created_at > now() - interval '7 days'),
    (select count(*) from public.trades where deleted_at is null and is_backtest = false),
    (select count(*) from public.trades where deleted_at is null and is_backtest = false and status = 'open'),
    (select count(*) from public.trades where deleted_at is null and is_backtest = false and status = 'closed'),
    (select count(*) from public.trades where deleted_at is null and is_backtest = false and traded_at > now() - interval '7 days'),
    (select count(*) from public.trades where deleted_at is null and option_type is not null),
    (select count(*) from public.ai_analysis),
    (select count(*) from public.ai_analysis where created_at > now() - interval '7 days'),
    (select coalesce(sum(tokens_used), 0) from public.ai_usage_daily where usage_date >= current_date - 7),
    (select count(*) from public.ai_usage_daily where usage_date = current_date and requests_count >= 3),
    (select count(*) from public.user_ai_settings where use_own_key),
    (select provider_name from public.ai_provider_config where is_default and is_active limit 1),
    (select model_name from public.ai_provider_config where is_default and is_active limit 1),
    (select count(*) from public.news_articles),
    (select max(fetched_at) from public.news_articles),
    (select count(*) from public.trader_plans),
    (select count(distinct user_id) from public.trader_plans),
    (select count(*) from public.push_subscriptions),
    (select count(*) from public.objectives where deleted_at is null),
    (select count(*) from public.trader_rules where deleted_at is null and is_active),
    (select count(*) from public.strategies where deleted_at is null and is_active),
    now();
end;
$$;

revoke all on function public.get_system_metrics() from public;
grant execute on function public.get_system_metrics() to authenticated;
