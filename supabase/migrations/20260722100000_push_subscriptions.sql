-- Web Push — una fila por suscripción de dispositivo/navegador. Un usuario
-- puede tener varias (varios dispositivos, o el navegador reinstala el SW y
-- rota el endpoint), por eso "endpoint" es la clave de upsert (no user_id):
-- el cliente hace upsert(onConflict: 'endpoint') al suscribirse, así que si
-- el mismo navegador vuelve a suscribirse no acumula filas muertas.
--
-- Usada por send-trade-reminders (Edge Function invocada 2x/día vía pg_cron,
-- ver 20260722110000_trade_reminder_cron_jobs.sql) para saber a quién
-- avisarle "¿ya registraste tu trade de hoy?". El insert/delete normal lo
-- hace el propio cliente (es dato propio del usuario, no requiere
-- service_role) — ver src/lib/pushNotifications.ts.
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_owner_all" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- El cliente (authenticated) lee/escribe solo su propia fila vía RLS de
-- arriba. send-trade-reminders corre con service_role: necesita leer TODAS
-- las suscripciones de TODOS los usuarios (RLS por diseño no lo permitiría)
-- y borrar las que el push service devuelva como 404/410 (endpoint muerto).
-- service_role bypassa RLS pero NO los grants de tabla — mismo bug class ya
-- documentado en CLAUDE.md (grants faltantes), así que el grant explícito de
-- abajo es obligatorio, no opcional.
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, delete on public.push_subscriptions to service_role;
