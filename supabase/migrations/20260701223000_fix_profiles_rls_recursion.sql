-- BUG REAL: "profiles_select_superadmin" consulta public.profiles DESDE una política
-- SOBRE public.profiles → Postgres reevalúa las políticas de profiles para resolver
-- esa misma subconsulta, entrando en loop: "infinite recursion detected in policy for
-- relation profiles". Se descubrió al conectar el login real (bloqueaba cualquier
-- select a profiles, incluso el propio).
--
-- Fix estándar de Postgres/Supabase para este anti-patrón: mover el check de rol a una
-- función security definer, que se ejecuta con permisos del dueño y no vuelve a pasar
-- por RLS al hacer su propia consulta interna a profiles.
create function public.is_superadmin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'superadmin'
  );
$$;

drop policy "profiles_select_superadmin" on public.profiles;
create policy "profiles_select_superadmin" on public.profiles
  for select using (public.is_superadmin(auth.uid()));

-- Mismo patrón repetido en el resto de policies de superadmin (no eran recursivas,
-- porque viven en otras tablas, pero se migran igual: por consistencia y para que
-- nadie las copie como plantilla para una tabla nueva y reintroduzca el bug).
drop policy "instruments_manage_global" on public.instruments;
create policy "instruments_manage_global" on public.instruments
  for all using (created_by is null and public.is_superadmin(auth.uid()));

drop policy "trades_select_superadmin" on public.trades;
create policy "trades_select_superadmin" on public.trades
  for select using (public.is_superadmin(auth.uid()));

drop policy "ai_provider_config_superadmin_only" on public.ai_provider_config;
create policy "ai_provider_config_superadmin_only" on public.ai_provider_config
  for all using (public.is_superadmin(auth.uid()));

drop policy "ai_prompts_superadmin_manage" on public.ai_prompts;
create policy "ai_prompts_superadmin_manage" on public.ai_prompts
  for all using (public.is_superadmin(auth.uid()));

drop policy "ai_analysis_superadmin_select" on public.ai_analysis;
create policy "ai_analysis_superadmin_select" on public.ai_analysis
  for select using (public.is_superadmin(auth.uid()));

drop policy "audit_log_superadmin_only" on public.audit_log;
create policy "audit_log_superadmin_only" on public.audit_log
  for select using (public.is_superadmin(auth.uid()));
