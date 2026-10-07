import { describe, expect, it } from 'vitest'
import { describePlanCell, summarizeSubscription, type SubscriptionRow } from '../src/lib/planSummary'

const NOW = new Date('2026-10-14T12:00:00Z')

function sub(patch: Partial<SubscriptionRow>): SubscriptionRow {
  return {
    plan_key: 'pro',
    status: 'active',
    current_period_end: null,
    cancel_at_period_end: false,
    trial_end: null,
    ...patch,
  }
}

describe('summarizeSubscription', () => {
  it('sin suscripción no inventa estado', () => {
    expect(summarizeSubscription(null, NOW)).toBeNull()
  })

  it('en prueba cuenta los días que quedan y toma trial_end como primer cobro', () => {
    const summary = summarizeSubscription(sub({ status: 'trialing', trial_end: '2026-11-07T12:00:00Z' }), NOW)
    expect(summary?.statusLabel).toBe('En prueba')
    expect(summary?.trialDaysLeft).toBe(24)
    expect(summary?.nextChargeAt).toBe('2026-11-07T12:00:00Z')
  })

  it('una prueba vencida no muestra días negativos', () => {
    const summary = summarizeSubscription(sub({ status: 'trialing', trial_end: '2026-10-01T00:00:00Z' }), NOW)
    expect(summary?.trialDaysLeft).toBe(0)
  })

  it('activa con cancelación programada avisa que no habrá próximo cobro', () => {
    const summary = summarizeSubscription(sub({ cancel_at_period_end: true, current_period_end: '2026-11-01T00:00:00Z' }), NOW)
    expect(summary?.statusLabel).toBe('Se cancelará')
    expect(summary?.endsAtPeriodEnd).toBe(true)
    expect(summary?.needsAttention).toBe(true)
  })

  it('cobro fallido pide atención', () => {
    expect(summarizeSubscription(sub({ status: 'past_due' }), NOW)).toMatchObject({ statusLabel: 'Cobro pendiente', needsAttention: true })
  })

  it('cancelada no tiene próximo cobro', () => {
    expect(summarizeSubscription(sub({ status: 'canceled', current_period_end: '2026-11-01T00:00:00Z' }), NOW)?.nextChargeAt).toBeNull()
  })
})

describe('describePlanCell', () => {
  it('marca como no incluido lo deshabilitado o con límite 0', () => {
    expect(describePlanCell({ plan_key: 'free', feature_key: 'news_briefs', enabled: false, hard_limit: 0, period: 'month' }, null)).toEqual({ kind: 'excluded' })
    expect(describePlanCell({ plan_key: 'free', feature_key: 'x', enabled: true, hard_limit: 0, period: 'day' }, null)).toEqual({ kind: 'excluded' })
    expect(describePlanCell(undefined, null)).toEqual({ kind: 'excluded' })
  })

  it('muestra el límite con su periodo', () => {
    expect(describePlanCell({ plan_key: 'free', feature_key: 'ai_actions', enabled: true, hard_limit: 3, period: 'day' }, 'Sin límite')).toEqual({ kind: 'included', detail: '3 por día' })
    expect(describePlanCell({ plan_key: 'pro', feature_key: 'ai_actions', enabled: true, hard_limit: 300, period: 'month' }, 'Sin límite')).toEqual({ kind: 'included', detail: '300 por mes' })
  })

  it('sin límite usa la etiqueta indicada', () => {
    expect(describePlanCell({ plan_key: 'byok', feature_key: 'ai_actions', enabled: true, hard_limit: null, period: null }, 'Sin límite')).toEqual({ kind: 'included', detail: 'Sin límite' })
    expect(describePlanCell({ plan_key: 'pro', feature_key: 'journal', enabled: true, hard_limit: null, period: null }, null)).toEqual({ kind: 'included', detail: null })
  })
})
