-- Auditoría global (para Panel SuperAdmin)
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,       -- 'trade.update' | 'admin.view_trade' | 'ai_provider.update' ...
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id, created_at desc);

alter table public.audit_log enable row level security;
create policy "audit_log_superadmin_only" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
-- Insert solo vía funciones security definer, nunca desde el cliente.

-- Importante: cada vez que un SuperAdmin lee un trade ajeno (política trades_select_superadmin),
-- debería quedar registrado aquí. AFTER SELECT no es soportado nativamente en Postgres — la
-- alternativa real es loguear el acceso desde la Edge Function/RPC que sirve el panel admin,
-- no como trigger de tabla. Pendiente de implementación en el backend (Fase 4).
