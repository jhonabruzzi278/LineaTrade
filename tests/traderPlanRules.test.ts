import { describe, expect, it } from 'vitest'
import { buildRuleDrafts, filterNewDrafts } from '../src/lib/traderPlanRules'
import { computeTraderPlan } from '../src/lib/traderPlanEngine'

describe('traderPlanRules', () => {
  const plan = computeTraderPlan({})

  it('arma cuatro borradores con las cifras del plan', () => {
    const drafts = buildRuleDrafts(plan)
    expect(drafts).toHaveLength(4)
    expect(drafts[0].title).toContain(`${String(plan.riskPerTradePercent).replace('.', ',')}%`)
    expect(drafts[1].title).toContain(`1:${String(plan.riskRewardRatio).replace('.', ',')}`)
    expect(drafts.every((d) => d.title.length > 0 && d.description.length > 0)).toBe(true)
  })

  it('omite los borradores que ya existen como regla', () => {
    const drafts = buildRuleDrafts(plan)
    const remaining = filterNewDrafts(drafts, [`  ${drafts[0].title.toUpperCase()} `])
    expect(remaining).toHaveLength(3)
    expect(remaining.some((d) => d.title === drafts[0].title)).toBe(false)
  })
})
