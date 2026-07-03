-- Fase 3 (Motor de IA) — endurece el almacenamiento de API keys BYOK/proveedor.
-- El diseño original (bytea "cifrado con pgsodium" sin ningún encrypt/decrypt
-- real conectado) se reemplaza por Supabase Vault: la key real vive únicamente
-- en vault.secrets (cifrada, con su propio manejo de key material), el cliente
-- nunca ve ni el texto plano ni el puntero cifrado — solo un uuid opaco que no
-- sirve de nada sin acceso a vault.decrypted_secrets (que "authenticated" no
-- tiene: verificado contra la instancia local, solo postgres/service_role
-- tienen select ahí).
--
-- No hay datos reales que migrar: ninguna key BYOK/de proveedor fue cargada
-- todavía (tablas nuevas, sin usuarios usando esto en producción), así que se
-- puede rediseñar la columna directamente en vez de cargar deuda de migración.

alter table public.user_ai_settings
  drop column if exists byok_api_key_encrypted,
  add column byok_secret_id uuid references vault.secrets(id);

alter table public.ai_provider_config
  drop column if exists api_key_encrypted,
  add column provider_secret_id uuid references vault.secrets(id);

-- El cliente ya no debe poder leer estas tablas directo: aunque hoy no
-- contienen la key en texto plano, siguen conteniendo el puntero (uuid) y,
-- en el caso de ai_provider_config, ya era superadmin-only. Para
-- user_ai_settings, angostamos el acceso a las RPCs de abajo.
revoke select, insert, update, delete on public.user_ai_settings from authenticated;

-- Escritura BYOK: siempre escribe para auth.uid(), nunca acepta un user_id del
-- caller (evita que un usuario configure/pise la key de otro).
create function public.set_byok_api_key(p_provider text, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

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
end;
$$;

revoke all on function public.set_byok_api_key(text, text) from public;
grant execute on function public.set_byok_api_key(text, text) to authenticated;

-- Desactivar BYOK sin borrar el secret (permite reactivar sin re-tipear la key).
create function public.disable_byok()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.user_ai_settings
  set use_own_key = false, updated_at = now()
  where user_id = auth.uid();
end;
$$;

revoke all on function public.disable_byok() from public;
grant execute on function public.disable_byok() to authenticated;

-- Lectura: el cliente solo ve el estado (proveedor, si está configurado, cuándo
-- se actualizó), nunca la key ni su puntero.
create function public.get_byok_status()
returns table (byok_provider text, is_configured boolean, use_own_key boolean, updated_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.byok_provider,
    s.byok_secret_id is not null as is_configured,
    coalesce(s.use_own_key, false) as use_own_key,
    s.updated_at
  from public.user_ai_settings s
  where s.user_id = auth.uid();
$$;

revoke all on function public.get_byok_status() from public;
grant execute on function public.get_byok_status() to authenticated;

-- Mismo patrón para la key global de proveedor (ai_provider_config), protegida
-- por el helper is_superadmin ya existente (evita reinventar el patrón
-- recursivo que 20260701223000 ya arregló).
create function public.set_provider_api_key(p_provider_config_id uuid, p_api_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret_id uuid;
  v_provider_name text;
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  select provider_name into v_provider_name
  from public.ai_provider_config
  where id = p_provider_config_id;

  if v_provider_name is null then
    raise exception 'provider_config_not_found';
  end if;

  v_secret_id := vault.create_secret(
    p_api_key,
    'provider:' || v_provider_name || ':' || p_provider_config_id::text,
    'API key de proveedor para ' || v_provider_name
  );

  update public.ai_provider_config
  set provider_secret_id = v_secret_id, updated_at = now()
  where id = p_provider_config_id;
end;
$$;

revoke all on function public.set_provider_api_key(uuid, text) from public;
grant execute on function public.set_provider_api_key(uuid, text) to authenticated;
