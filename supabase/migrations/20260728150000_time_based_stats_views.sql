-- Vistas nuevas para el motor de insights cross-trade (Fase 4) — ninguna vista
-- existente desglosa por día de semana u hora del día. traded_at es timestamptz (UTC);
-- profiles.timezone (default 'UTC') permite mostrar "los lunes" en la hora local del
-- usuario en vez de UTC, que es lo que el usuario realmente percibe como "lunes".

create view public.v_user_stats_by_weekday
with (security_invoker = true)
as
select
  t.user_id,
  -- 0 = domingo .. 6 = sábado (extract(dow ...) de Postgres)
  extract(dow from t.traded_at at time zone p.timezone)::smallint as weekday,
  count(*) as total_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(t.pnl_r), 2) as avg_r,
  round(sum(t.pnl_amount), 2) as net_pnl
from public.trades t
join public.profiles p on p.id = t.user_id
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
group by t.user_id, extract(dow from t.traded_at at time zone p.timezone);

grant select on public.v_user_stats_by_weekday to authenticated;

create view public.v_user_stats_by_hour
with (security_invoker = true)
as
select
  t.user_id,
  extract(hour from t.traded_at at time zone p.timezone)::smallint as hour_of_day,
  count(*) as total_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*), 0) * 100, 2
  ) as win_rate,
  round(avg(t.pnl_r), 2) as avg_r,
  round(sum(t.pnl_amount), 2) as net_pnl
from public.trades t
join public.profiles p on p.id = t.user_id
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false
group by t.user_id, extract(hour from t.traded_at at time zone p.timezone);

grant select on public.v_user_stats_by_hour to authenticated;
