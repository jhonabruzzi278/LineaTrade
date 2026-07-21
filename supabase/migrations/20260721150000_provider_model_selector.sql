-- Fase 3 (Motor de IA) — hasta ahora, cambiar provider_name/model_name en
-- ai_provider_config requería un UPDATE por SQL directo (ver CLAUDE.md,
-- sección Perfil/AdminPanel): /admin solo tenía un input para pegar la API
-- key de "el proveedor que ya esté en esa fila", nunca para elegir cuál.
-- Bug real que esto produjo: un superadmin guardó una key de OpenAI en la
-- fila (todavía etiquetada 'groq'), y tanto analyze-trade como
-- extract-trade-image la mandaron igual contra el endpoint de Groq —
-- rechazada con 401, surfaceada como 502 genérico. Con la migración anterior
-- (20260721140000) ya se arregló la rotación de key vía vault.update_secret;
-- esta agrega el selector real de provider/model.
--
-- set_provider_model() es la contraparte de set_provider_api_key(): cambia
-- QUÉ proveedor/modelo usa la fila por defecto. Si provider_name realmente
-- cambia, la key guardada (para el proveedor viejo) deja de tener sentido —
-- se limpia provider_secret_id a null en el mismo UPDATE, para que la UI
-- muestre "sin key configurada" y el superadmin tenga que cargar una key
-- válida para el proveedor nuevo antes de que analyze-trade/
-- extract-trade-image vuelvan a andar. El secret viejo en vault.secrets
-- queda huérfano (no se borra) — no es un riesgo de seguridad (nunca fue
-- legible por el cliente) y borrarlo requeriría una llamada extra a
-- vault.delete_secret que no aporta nada al fix.
create function public.set_provider_model(p_provider_config_id uuid, p_provider_name text, p_model_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_provider text;
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  select provider_name into v_current_provider
  from public.ai_provider_config
  where id = p_provider_config_id;

  if v_current_provider is null then
    raise exception 'provider_config_not_found';
  end if;

  if v_current_provider is distinct from p_provider_name then
    update public.ai_provider_config
    set provider_name = p_provider_name,
        model_name = p_model_name,
        provider_secret_id = null,
        updated_at = now()
    where id = p_provider_config_id;
  else
    update public.ai_provider_config
    set model_name = p_model_name,
        updated_at = now()
    where id = p_provider_config_id;
  end if;
end;
$$;

revoke all on function public.set_provider_model(uuid, text, text) from public;
grant execute on function public.set_provider_model(uuid, text, text) to authenticated;
