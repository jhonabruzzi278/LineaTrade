// Fase 3 (Motor de IA) — wrapper delgado sobre check_and_increment_ai_usage
// (migración 20260703100100). El límite real vive acá como constante de
// aplicación (nunca hardcodeado en SQL) — ver PRD §3.1: 3 análisis/día en
// tier gratuito, BYOK sin límite práctico.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from './database.types.ts'

export const FREE_TIER_DAILY_LIMIT = 3
// Sentinel alto para BYOK: no bloquea en la práctica, pero seguimos pasando
// por la misma función atómica para mantener un ledger completo de uso
// (PRD §3.7 — observabilidad de costos), no solo para el tier gratuito.
export const BYOK_DAILY_LIMIT_SENTINEL = 999_999

export interface RateLimitResult {
  allowed: boolean
  requestsCount: number
  tokensUsed: number
}

export async function checkAndIncrementUsage(
  serviceClient: SupabaseClient<Database>,
  userId: string,
  tokens: number,
  source: 'free_tier' | 'byok',
): Promise<RateLimitResult> {
  const dailyLimit = source === 'free_tier' ? FREE_TIER_DAILY_LIMIT : BYOK_DAILY_LIMIT_SENTINEL

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
