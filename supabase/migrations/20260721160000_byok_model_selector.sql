-- Fase 3 (Motor de IA) — mismo bug que ya se arregló para la key
-- agnóstica del admin (20260721150000), pero del lado BYOK: analyze-trade y
-- extract-trade-image hardcodeaban un nombre de modelo Groq-específico
-- ('openai/gpt-oss-20b' y 'qwen/qwen3.6-27b' respectivamente) para CUALQUIER
-- proveedor BYOK, porque user_ai_settings nunca tuvo una columna de modelo.
-- Un usuario que configuraba BYOK con su propia key de OpenAI (una opción
-- que ConfiguracionIA.tsx ya ofrecía en el selector) recibía "invalid model
-- ID" de la API real de OpenAI en cualquiera de las dos funciones — el mismo
-- síntoma que ya se diagnosticó y arregló para la key por defecto del admin,
-- sin haber tocado todavía este segundo lugar donde se repetía.
alter table public.user_ai_settings
  add column byok_model text;

-- set_byok_api_key ahora también guarda el modelo. Cambia la firma (agrega
-- un parámetro), así que hace falta dropear la versión de 2 argumentos —
-- create or replace no alcanza para un cambio de firma.
drop function if exists public.set_byok_api_key(text, text);

create function public.set_byok_api_key(p_provider text, p_api_key text, p_model text)
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
    set byok_provider = p_provider, byok_model = p_model, use_own_key = true, updated_at = now()
    where user_id = auth.uid();
  else
    v_secret_id := vault.create_secret(
      p_api_key,
      'byok:' || auth.uid()::text || ':' || p_provider,
      'BYOK API key para ' || p_provider
    );

    insert into public.user_ai_settings (user_id, byok_provider, byok_model, byok_secret_id, use_own_key)
    values (auth.uid(), p_provider, p_model, v_secret_id, true)
    on conflict (user_id) do update set
      byok_provider = excluded.byok_provider,
      byok_model = excluded.byok_model,
      byok_secret_id = excluded.byok_secret_id,
      use_own_key = true,
      updated_at = now();
  end if;
end;
$$;

revoke all on function public.set_byok_api_key(text, text, text) from public;
grant execute on function public.set_byok_api_key(text, text, text) to authenticated;

-- get_byok_status expone el modelo guardado para que la UI lo pre-cargue al
-- editar, mismo patrón que ya usa AdminPanel para el proveedor por defecto.
-- create or replace no alcanza acá: cambia el row type definido por los OUT
-- params (agrega una columna), Postgres exige drop + create para eso.
drop function if exists public.get_byok_status();

create function public.get_byok_status()
returns table (byok_provider text, byok_model text, is_configured boolean, use_own_key boolean, updated_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select
    s.byok_provider,
    s.byok_model,
    s.byok_secret_id is not null as is_configured,
    coalesce(s.use_own_key, false) as use_own_key,
    s.updated_at
  from public.user_ai_settings s
  where s.user_id = auth.uid();
$$;

revoke all on function public.get_byok_status() from public;
grant execute on function public.get_byok_status() to authenticated;
