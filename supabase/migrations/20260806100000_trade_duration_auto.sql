-- trades.duration_minutes existe desde el schema original pero ningún código lo
-- escribía nunca (columna siempre null) — el panel /reporte necesita "Duración
-- promedio" con datos reales, no inventados. Se calcula acá, en el mismo trigger que
-- ya calcula pnl_amount/pnl_r al cerrar (backend calcula, nunca el cliente), no en un
-- migración nueva de columna: la columna ya existía, solo faltaba quién la llenara.
--
-- Se reemplaza la función completa (mismo patrón ya usado para get_system_metrics()
-- en 20260727100000/20260729100000): la migración 20260702130000 que la creó ya está
-- aplicada en producción y no se edita in place.
--
-- Solo se calcula en la transición real a 'closed', no en cada UPDATE posterior a un
-- trade ya cerrado (ej. editar un comentario no debe "alargar" la duración) — de ahí
-- el chequeo de tg_op/old.status en vez de recalcular siempre que status = 'closed'.
create or replace function public.trg_calculate_trade_pnl()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' and new.exit_price is not null then
    if new.side = 'long' then
      new.pnl_amount = (new.exit_price - new.entry_price) * coalesce(new.position_size, 0) - coalesce(new.commission, 0);
    else
      new.pnl_amount = (new.entry_price - new.exit_price) * coalesce(new.position_size, 0) - coalesce(new.commission, 0);
    end if;

    if new.stop_loss is not null and new.stop_loss <> new.entry_price and coalesce(new.position_size, 0) > 0 then
      new.pnl_r = round(
        new.pnl_amount / (abs(new.entry_price - new.stop_loss) * new.position_size), 4
      );
    else
      new.pnl_r = null;
    end if;

    if (tg_op = 'INSERT' and new.duration_minutes is null)
       or (tg_op = 'UPDATE' and old.status is distinct from 'closed') then
      new.duration_minutes = greatest(0, round(extract(epoch from (now() - new.traded_at)) / 60))::integer;
    end if;
  end if;
  return new;
end;
$$;

comment on column public.trades.duration_minutes is
  'Minutos entre traded_at (entrada) y el momento del UPDATE que cerró el trade '
  '(now() en ese instante — no hay columna closed_at separada). Calculado solo en '
  'la transición real a status=closed por trg_calculate_trade_pnl(), nunca en '
  'ediciones posteriores. Trades cerrados antes de 20260806100000 quedan en null '
  '(no se estima retroactivamente) — v_user_trade_stats y /reporte deben excluir '
  'null del promedio, no tratarlo como 0.';
