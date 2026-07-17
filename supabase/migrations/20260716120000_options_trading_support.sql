-- Soporte para trades de opciones — contrato simple (un call o un put por
-- trade; sin multi-leg todavía). instrument_market ya tenía 'options' como
-- valor válido desde el schema original, pero trades no tenía ningún campo
-- propio del contrato — esto lo cierra.
create type public.option_type as enum ('call', 'put');

alter table public.trades
  add column option_type public.option_type,
  add column strike_price numeric,
  add column expiration_date date;

comment on column public.trades.option_type is
  'Call o put — solo aplica cuando instruments.market = ''options''.';
comment on column public.trades.strike_price is
  'Precio de ejercicio del contrato — solo opciones.';
comment on column public.trades.expiration_date is
  'Fecha de vencimiento del contrato — solo opciones.';

-- entry_price/exit_price para opciones representan la prima por acción (la
-- convención de cotización estándar), no por contrato — el trigger de PnL
-- necesita el multiplicador de 100 acciones/contrato para que pnl_amount sea
-- un monto en dólares real. pnl_r no cambia de valor con el multiplicador
-- (aparece igual en numerador y denominador), pero se aplica en ambos lados
-- para mantener la fórmula dimensionalmente consistente.
create or replace function public.trg_calculate_trade_pnl()
returns trigger
language plpgsql
as $$
declare
  v_market public.instrument_market;
  v_multiplier numeric := 1;
begin
  select market into v_market from public.instruments where id = new.instrument_id;
  if v_market = 'options' then
    v_multiplier := 100;
  end if;

  if new.status = 'closed' and new.exit_price is not null then
    if new.side = 'long' then
      new.pnl_amount = (new.exit_price - new.entry_price) * coalesce(new.position_size, 0) * v_multiplier - coalesce(new.commission, 0);
    else
      new.pnl_amount = (new.entry_price - new.exit_price) * coalesce(new.position_size, 0) * v_multiplier - coalesce(new.commission, 0);
    end if;

    if new.stop_loss is not null and new.stop_loss <> new.entry_price and coalesce(new.position_size, 0) > 0 then
      new.pnl_r = round(
        new.pnl_amount / (abs(new.entry_price - new.stop_loss) * new.position_size * v_multiplier), 4
      );
    else
      new.pnl_r = null;
    end if;
  end if;
  return new;
end;
$$;
