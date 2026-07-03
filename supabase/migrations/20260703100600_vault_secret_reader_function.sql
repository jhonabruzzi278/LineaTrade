-- Fase 3 (Motor de IA) — hallazgo real durante las pruebas end-to-end: PostgREST
-- solo expone los schemas listados en [api] schemas de config.toml (public,
-- graphql_public) — el schema "vault" NO está ahí, así que
-- `.schema('vault').from('decrypted_secrets')` desde supabase-js siempre falla
-- con PGRST106 "Invalid schema: vault", sin importar los grants de tabla.
--
-- Fix: en vez de agregar "vault" a los schemas expuestos (ampliaría la
-- superficie de la API REST a TODO el schema vault, incluida vault.secrets),
-- se envuelve la lectura en una función security definer en "public" — mismo
-- patrón que check_and_increment_ai_usage: vive en un schema ya expuesto,
-- pero el grant de ejecución queda restringido a service_role, así que sigue
-- siendo inalcanzable para "authenticated".
create function public.read_vault_secret(p_secret_id uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_secret_id;
$$;

revoke all on function public.read_vault_secret(uuid) from public;
grant execute on function public.read_vault_secret(uuid) to service_role;
