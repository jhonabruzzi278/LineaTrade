-- Fase 3 (Motor de IA) — fix real: set_provider_api_key y set_byok_api_key
-- (20260703100200) siempre llamaban vault.create_secret(...) con un name
-- determinístico ('provider:'||provider_name||':'||config_id, o
-- 'byok:'||user_id||':'||provider). vault.secrets.name es unique, así que la
-- PRIMERA vez que se guarda una key funciona, pero la segunda vez (rotar la
-- key del proveedor agnóstico desde /admin, o que un usuario BYOK actualice
-- la suya) siempre revienta con 23505 unique_violation -> PostgREST 409,
-- antes de llegar al update que apunta la fila a la nueva key. El resultado
-- observado en el panel de admin: guardar la key por primera vez anda, volver
-- a guardar (o simplemente reintentar tras otro error) tira 409 y la key
-- vieja queda activa sin que nada lo avise.
--
-- Fix: si ya existe un secreto para ese target (provider_secret_id /
-- byok_secret_id no nulo), rotarlo in-place con vault.update_secret en vez de
-- crear uno nuevo. Solo se crea un secreto nuevo la primera vez. No se edita
-- 20260703100200 (ya aplicada) -- create or replace sobre la misma firma.

create or replace function public.set_provider_api_key(p_provider_config_id uuid, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_id uuid;
  v_provider_name text;
  v_existing_secret_id uuid;
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  select provider_name, provider_secret_id into v_provider_name, v_existing_secret_id
  from public.ai_provider_config
  where id = p_provider_config_id;

  if v_provider_name is null then
    raise exception 'provider_config_not_found';
  end if;

  if v_existing_secret_id is not null then
    perform vault.update_secret(v_existing_secret_id, p_api_key);

    update public.ai_provider_config
    set updated_at = now()
    where id = p_provider_config_id;
  else
    v_secret_id := vault.create_secret(
      p_api_key,
      'provider:' || v_provider_name || ':' || p_provider_config_id::text,
      'API key de proveedor para ' || v_provider_name
    );

    update public.ai_provider_config
    set provider_secret_id = v_secret_id, updated_at = now()
    where id = p_provider_config_id;
  end if;
end;
$$;

revoke all on function public.set_provider_api_key(uuid, text) from public;
grant execute on function public.set_provider_api_key(uuid, text) to authenticated;

create or replace function public.set_byok_api_key(p_provider text, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_id uuid;
  v_existing_secret_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select byok_secret_id into v_existing_secret_id
  from public.user_ai_settings
  where user_id = auth.uid();

  if v_existing_secret_id is not null then
    perform vault.update_secret(v_existing_secret_id, p_api_key);

    update public.user_ai_settings
    set byok_provider = p_provider, use_own_key = true, updated_at = now()
    where user_id = auth.uid();
  else
    v_secret_id := vault.create_secret(
      p_api_key,
      'byok:' || auth.uid()::text || ':' || p_provider,
      'BYOK API key para ' || p_provider
    );

    insert into public.user_ai_settings (user_id, byok_provider, byok_secret_id, use_own_key)
    values (auth.uid(), p_provider, v_secret_id, true)
    on conflict (user_id) do update set
      byok_provider = excluded.byok_provider,
      byok_secret_id = excluded.byok_secret_id,
      use_own_key = true,
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.set_byok_api_key(text, text) from public;
grant execute on function public.set_byok_api_key(text, text) to authenticated;
