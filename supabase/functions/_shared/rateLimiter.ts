// Fase 3 (Motor de IA) — wrapper delgado sobre check_and_increment_ai_usage
// (migración 20260703100100). El límite del tier gratuito ya no es una
// constante fija en código — vive en ai_rate_limit_config (migración
// 20260803130000, fila única) y es editable desde /admin
// (set_ai_rate_limit RPC) sin redeployar ningún Edge Function. Antes de esa
// migración esto era `export const FREE_TIER_DAILY_LIMIT = 3`; se mantiene
// como fallback si la fila de config no existiera por algún motivo.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from './database.types.ts'

const FREE_TIER_DAILY_LIMIT_FALLBACK = 3
// Sentinel alto para BYOK: no bloquea en la práctica, pero seguimos pasando
// por la misma función atómica para mantener un ledger completo de uso
// (PRD §3.7 — observabilidad de costos), no solo para el tier gratuito.
export const BYOK_DAILY_LIMIT_SENTINEL = 999_999

export interface RateLimitResult {
  allowed: boolean
  requestsCount: number
  tokensUsed: number
}

async function resolveFreeTierDailyLimit(serviceClient: SupabaseClient<Database>): Promise<number> {
  const { data } = await serviceClient.from('ai_rate_limit_config').select('free_tier_daily_limit').eq('id', 1).maybeSingle()
  return data?.free_tier_daily_limit ?? FREE_TIER_DAILY_LIMIT_FALLBACK
}

export async function checkAndIncrementUsage(
  serviceClient: SupabaseClient<Database>,
  userId: string,
  tokens: number,
  source: 'free_tier' | 'byok',
): Promise<RateLimitResult> {
  const dailyLimit = source === 'free_tier' ? await resolveFreeTierDailyLimit(serviceClient) : BYOK_DAILY_LIMIT_SENTINEL

  const { data, error } = await serviceClient.rpc('check_and_increment_ai_usage', {
    p_user_id: userId,
    p_tokens: tokens,
    p_source: source,
    p_daily_limit: dailyLimit,
  })

  if (error) throw new Error(`No se pudo verificar el límite de uso: ${error.message}`)
  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new Error('check_and_increment_ai_usage no devolvió resultado.')

  return { allowed: row.allowed, requestsCount: row.requests_count, tokensUsed: row.tokens_used }
}
