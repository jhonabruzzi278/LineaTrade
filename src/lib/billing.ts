import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { PlanEntitlementRow, SubscriptionRow } from './planSummary'

// Lectura de facturación del usuario. Las tablas `subscriptions` y
// `plan_entitlements` existen (migración 20260915130000, select para
// `authenticated` por RLS) pero todavía no están en src/types/database.ts, que
// es generado (`npm run db:types`) y no se edita a mano. Hasta regenerarlo se
// consulta con un cliente sin tipos y se tipan las filas aquí. Solo lectura:
// toda escritura de pagos la hace Flow vía Edge Functions con service_role.
const untypedClient = supabase as unknown as SupabaseClient

/** Suscripción más reciente del usuario (RLS limita a la propia). */
export async function fetchLatestSubscription(): Promise<SubscriptionRow | null> {
  const { data, error } = await untypedClient
    .from('subscriptions')
    .select('plan_key, status, current_period_end, cancel_at_period_end, trial_end')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as SubscriptionRow | null) ?? null
}

/** Límites de todos los planes, para la tabla comparativa. */
export async function fetchPlanEntitlements(): Promise<PlanEntitlementRow[]> {
  const { data, error } = await untypedClient
    .from('plan_entitlements')
    .select('plan_key, feature_key, enabled, hard_limit, period')
  if (error) throw error
  return (data as PlanEntitlementRow[] | null) ?? []
}

/** Acciones de IA consumidas desde el día 1 del mes (UTC), sumando ai_usage_daily. */
export async function fetchAiUsageThisMonth(now: Date = new Date()): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const { data, error } = await supabase.from('ai_usage_daily').select('requests_count').gte('usage_date', monthStart)
  if (error) throw error
  return (data ?? []).reduce((total, row) => total + row.requests_count, 0)
}
