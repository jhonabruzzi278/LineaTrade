-- Fase 4 (Panel de SuperAdmin) — metricas de sistema, cero datos de usuarios.
--
-- 20260703100300 revoco el acceso directo de superadmin a trades/ai_analysis
-- porque el PRD exige que cualquier lectura de datos IDENTIFICABLES de otro
-- usuario pase por una Edge Function auditada (v1.1, todavia no construida).
-- Esta funcion es una categoria distinta a proposito: devuelve unicamente
-- conteos/sumas agregadas de TODO el sistema — ninguna columna trae user_id,
-- email ni nada que identifique a un usuario puntual — asi que no le aplica
-- esa restriccion y no hace falta esperar a la Edge Function de v1.1.
--
-- Mismo patron que set_provider_api_key (20260703100200): security definer +
-- chequeo interno de is_superadmin(auth.uid()), no una policy RLS. Una view
-- con security_invoker=true (como v_user_trade_stats) no serviria aca: esa
-- tecnica hace que la view respete el RLS del que consulta, o sea que cada
-- usuario seguiria viendo solo sus propias filas — el objetivo aca es agregar
-- across TODOS los usuarios, lo opuesto.
--
-- auth.users no esta expuesta al Data API — leerla requiere security definer,
-- mismo mecanismo que ya usa el trigger handle_new_user.
--
-- El insert a audit_log corre con el privilegio del dueno de la funcion
-- (postgres), no necesita grant de insert a authenticated en audit_log — igual
-- que cualquier otro write hecho desde una funcion security definer en este
-- proyecto. Se registra ANTES de devolver los datos, mismo espiritu que el
-- principio de auditoria del PRD, aplicado aca por transparencia extra (no
-- por ser estrictamente exigido, ya que no hay dato individual involucrado).
create function public.get_system_metrics()
returns table (
  total_users bigint,
  active_users_7d bigint,
  active_users_30d bigint,
  new_users_7d bigint,
  total_trades bigint,
  open_trades bigint,
  closed_trades bigint,
  trades_7d bigint,
  total_ai_analyses bigint,
  ai_analyses_7d bigint,
  ai_tokens_used_7d bigint,
  users_hit_daily_limit_today bigint,
  default_ai_provider text,
  default_ai_model text,
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
    (select count(*) from public.trades where deleted_at is null),
    (select count(*) from public.trades where deleted_at is null and status = 'open'),
    (select count(*) from public.trades where deleted_at is null and status = 'closed'),
    (select count(*) from public.trades where deleted_at is null and traded_at > now() - interval '7 days'),
    (select count(*) from public.ai_analysis),
    (select count(*) from public.ai_analysis where created_at > now() - interval '7 days'),
    (select coalesce(sum(tokens_used), 0) from public.ai_usage_daily where usage_date >= current_date - 7),
    (select count(*) from public.ai_usage_daily where usage_date = current_date and requests_count >= 3),
    (select provider_name from public.ai_provider_config where is_default and is_active limit 1),
    (select model_name from public.ai_provider_config where is_default and is_active limit 1),
    now();
end;
$$;

revoke all on function public.get_system_metrics() from public;
grant execute on function public.get_system_metrics() to authenticated;
