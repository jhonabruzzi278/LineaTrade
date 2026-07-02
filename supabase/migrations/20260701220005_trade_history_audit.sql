-- Trade History — Auditoría automática de campos críticos
-- Resuelve la tensión entre "edición libre" y "evidencia objetiva": el usuario
-- edita sin fricción, el sistema registra qué cambió realmente sin pedirle nada extra.
create table public.trade_history (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references public.profiles(id),
  field_name  text not null,
  old_value   text,
  new_value   text
);

create index idx_trade_history_trade on public.trade_history(trade_id, changed_at desc);

alter table public.trade_history enable row level security;

-- Solo lectura para el dueño del trade; nunca insert/update/delete manual (solo vía trigger)
create policy "trade_history_select_owner" on public.trade_history
  for select using (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
  );

-- Función de trigger: compara campos críticos y registra cambios
create function public.trg_audit_trade_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.entry_price is distinct from new.entry_price then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'entry_price', old.entry_price::text, new.entry_price::text);
  end if;
  if old.exit_price is distinct from new.exit_price then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'exit_price', old.exit_price::text, new.exit_price::text);
  end if;
  if old.stop_loss is distinct from new.stop_loss then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'stop_loss', old.stop_loss::text, new.stop_loss::text);
  end if;
  if old.take_profit is distinct from new.take_profit then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'take_profit', old.take_profit::text, new.take_profit::text);
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger trades_audit_before_update
  before update on public.trades
  for each row execute function public.trg_audit_trade_changes();

-- Con esto, moved_stop_loss (autoreporte) puede compararse contra
-- select count(*) from trade_history where trade_id = X and field_name = 'stop_loss'
-- (dato objetivo). La discrepancia entre ambos es, en sí misma, una señal
-- psicológica útil para la IA.
