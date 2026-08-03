-- Rendimiento por tag de psicología (win rate, profit factor, avg R para cada
-- boolean auto-reportado en Psicología). "Filtrado por ese boolean = true" — la
-- pregunta es "cuando tuve FOMO, ¿cómo me fue?", no "¿cuántos trades tuvieron FOMO?".
-- Mismo flag de is_backtest y seguridad que todas las demás vistas agregadas.

create view public.v_user_psychology_tag_stats
with (security_invoker = true)
as
select
  t.user_id,
  p.tag_name,
  count(*) as total_trades,
  -- El WHERE de esta vista ya restringe todo a status = 'closed' (línea de
  -- abajo) — los filter() de acá adentro solo necesitan acotar por
  -- pnl_amount/sign, repetir "status = 'closed'" en cada uno era redundante.
  count(*) filter (where t.pnl_amount is not null) as closed_trades,
  round(
    count(*) filter (where t.pnl_amount > 0)::numeric
    / nullif(count(*) filter (where t.pnl_amount is not null), 0) * 100, 2
  ) as win_rate,
  round(
    sum(t.pnl_amount) filter (where t.pnl_amount > 0)
    / nullif(abs(sum(t.pnl_amount) filter (where t.pnl_amount < 0)), 0), 2
  ) as profit_factor,
  round(avg(t.pnl_r) filter (where t.pnl_amount is not null), 2) as avg_r
from public.trades t
cross join lateral (values
  ('Siguió el plan', t.followed_plan),
  ('Tuvo FOMO', t.had_fomo),
  ('Movió el stop loss', t.moved_stop_loss),
  ('Movió el take profit', t.moved_take_profit),
  ('Overtrading', t.overtraded),
  ('Cerró antes de tiempo', t.closed_early),
  ('Entró por impulso', t.entered_impulsively),
  ('Dudó antes de entrar', t.hesitated),
  ('Exceso de confianza', t.overconfidence),
  ('Hubo distracciones', t.had_distractions),
  ('Venganza (revenge)', t.revenge_trade)
) as p(tag_name, flag)
where t.deleted_at is null and t.status = 'closed' and t.is_backtest = false and p.flag = true
group by t.user_id, p.tag_name;

grant select on public.v_user_psychology_tag_stats to authenticated;
