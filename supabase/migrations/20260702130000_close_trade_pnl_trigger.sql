-- Cierre de trade: calcula pnl_amount y pnl_r en el backend, nunca en el cliente
-- ("el backend calcula, la IA interpreta" — el mismo principio, aplicado ahora al
-- monto de la operación en vez de a las estadísticas agregadas). El cliente solo
-- envía exit_price + status = 'closed'; el trigger hace la aritmética.
--
-- pnl_amount: (exit - entry) * tamaño - comisiones, con el signo invertido para short.
-- pnl_r: pnl_amount / (riesgo en unidades de precio * tamaño), solo si hay stop_loss —
-- sin un stop definido no existe una unidad de riesgo con la cual normalizar, así que
-- se deja null en vez de inventar un denominador.
create function public.trg_calculate_trade_pnl()
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
  end if;
  return new;
end;
$$;

-- before insert or update: cubre tanto "cerrar un trade ya existente" (el flujo actual,
-- vía UPDATE desde TradeDetail) como una futura importación que inserte trades ya
-- cerrados directamente.
create trigger trades_calculate_pnl
  before insert or update on public.trades
  for each row execute function public.trg_calculate_trade_pnl();
