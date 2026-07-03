// Fase 3 (Motor de IA) — dos clientes distintos por request, a propósito.
//
// userClient corre CADA query como el usuario que llama (via su JWT), así que
// RLS (trades_owner_all, etc.) es lo que realmente decide qué puede ver — el
// código de la función nunca tiene que reimplementar un chequeo de ownership
// a mano. serviceClient se usa solo donde hace falta el privilegio elevado:
// leer ai_provider_config (RLS superadmin-only), decriptar de
// vault.decrypted_secrets, llamar check_and_increment_ai_usage (grant
// restringido a service_role), e insertar en ai_analysis (sin policy de
// insert para el cliente, por diseño).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from './database.types.ts'

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Falta la variable de entorno ${name}`)
  return value
}

export function createUserClient(authHeader: string): SupabaseClient<Database> {
  const url = requiredEnv('SUPABASE_URL')
  const anonKey = requiredEnv('SUPABASE_ANON_KEY')
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
}

export function createServiceClient(): SupabaseClient<Database> {
  const url = requiredEnv('SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false },
  })
}

// Lee un secret ya decriptado de Vault. PostgREST no expone el schema "vault"
// en absoluto (solo public/graphql_public — ver migración
// 20260703100600_vault_secret_reader_function.sql), así que esto pasa por la
// función security definer public.read_vault_secret(), cuyo grant de ejecución
// está restringido a service_role. Nunca llamar con el userClient.
export async function readVaultSecret(serviceClient: SupabaseClient<Database>, secretId: string): Promise<string | null> {
  const { data, error } = await serviceClient.rpc('read_vault_secret', { p_secret_id: secretId })
  if (error) return null
  return data
}
