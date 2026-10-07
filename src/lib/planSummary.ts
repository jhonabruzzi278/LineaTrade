// Tipos y lógica pura de facturación (sin acceso a red: testeable).

export type PlanKey = 'free' | 'pro' | 'byok'

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

export interface SubscriptionRow {
  plan_key: PlanKey
  status: SubscriptionStatus
  current_period_end: string | null
  cancel_at_period_end: boolean
  trial_end: string | null
}

export interface PlanEntitlementRow {
  plan_key: PlanKey
  feature_key: string
  enabled: boolean
  hard_limit: number | null
  period: 'day' | 'month' | 'lifetime' | null
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export interface SubscriptionSummary {
  /** Etiqueta corta del estado, en mayúsculas (se pinta como Tag). */
  statusLabel: string
  /** Estado que merece atención (cobro fallido, cancelación programada). */
  needsAttention: boolean
  /** Días que quedan de prueba, si está en prueba y la fecha es futura. */
  trialDaysLeft: number | null
  /** Fecha del próximo cobro / fin del periodo, si se conoce. */
  nextChargeAt: string | null
  /** Se cancelará al terminar el periodo: no habrá próximo cobro. */
  endsAtPeriodEnd: boolean
}

export function summarizeSubscription(sub: SubscriptionRow | null, now: Date = new Date()): SubscriptionSummary | null {
  if (!sub) return null
  const trialing = sub.status === 'trialing'
  const trialDaysLeft =
    trialing && sub.trial_end ? Math.max(0, Math.ceil((new Date(sub.trial_end).getTime() - now.getTime()) / MS_PER_DAY)) : null
  const nextChargeAt = trialing ? (sub.trial_end ?? sub.current_period_end) : sub.current_period_end

  switch (sub.status) {
    case 'trialing':
      return { statusLabel: 'En prueba', needsAttention: sub.cancel_at_period_end, trialDaysLeft, nextChargeAt, endsAtPeriodEnd: sub.cancel_at_period_end }
    case 'active':
      return { statusLabel: sub.cancel_at_period_end ? 'Se cancelará' : 'Activa', needsAttention: sub.cancel_at_period_end, trialDaysLeft: null, nextChargeAt, endsAtPeriodEnd: sub.cancel_at_period_end }
    case 'past_due':
    case 'unpaid':
      return { statusLabel: 'Cobro pendiente', needsAttention: true, trialDaysLeft: null, nextChargeAt, endsAtPeriodEnd: false }
    case 'paused':
      return { statusLabel: 'Pausada', needsAttention: true, trialDaysLeft: null, nextChargeAt: null, endsAtPeriodEnd: false }
    case 'canceled':
      return { statusLabel: 'Cancelada', needsAttention: false, trialDaysLeft: null, nextChargeAt: null, endsAtPeriodEnd: false }
    default:
      return { statusLabel: 'Incompleta', needsAttention: true, trialDaysLeft: null, nextChargeAt: null, endsAtPeriodEnd: false }
  }
}

export type PlanCell =
  | { kind: 'included'; detail: string | null }
  | { kind: 'excluded' }

const PERIOD_LABELS: Record<string, string> = { day: 'por día', month: 'por mes', lifetime: 'en total' }

/** Qué muestra la tabla comparativa para un plan y una función. */
export function describePlanCell(row: PlanEntitlementRow | undefined, unlimitedLabel: string | null): PlanCell {
  if (!row || !row.enabled || row.hard_limit === 0) return { kind: 'excluded' }
  if (row.hard_limit === null) return { kind: 'included', detail: unlimitedLabel }
  return { kind: 'included', detail: `${row.hard_limit} ${row.period ? PERIOD_LABELS[row.period] : ''}`.trim() }
}
