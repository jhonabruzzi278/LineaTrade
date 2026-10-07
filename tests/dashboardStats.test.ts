import { describe, expect, it } from 'vitest'
import { computeDashboardStats, curveToPoints, filterByPeriod, previousPeriodRows } from '../src/lib/dashboardStats'
import type { ClosedTradeRow } from '../src/lib/reportStats'

const NOW = new Date('2026-10-07T12:00:00Z')

function row(daysAgo: number, pnl: number, r: number | null): ClosedTradeRow {
  return {
    traded_at: new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString(),
    pnl_amount: pnl,
    pnl_r: r,
    duration_minutes: null,
    strategy_id: null,
    strategy_name: null,
  }
}

const rows = [row(40, 100, 1), row(20, -50, -1), row(10, 300, 2), row(2, -40, -0.4), row(1, 60, 0.6)]

describe('dashboardStats', () => {
  it('filtra por periodo y calcula el periodo anterior', () => {
    expect(filterByPeriod(rows, '7d', NOW)).toHaveLength(2)
    expect(filterByPeriod(rows, '30d', NOW)).toHaveLength(4)
    expect(filterByPeriod(rows, 'all', NOW)).toHaveLength(5)
    expect(previousPeriodRows(rows, '30d', NOW)).toHaveLength(1)
    expect(previousPeriodRows(rows, 'all', NOW)).toHaveLength(0)
  })

  it('calcula win rate, profit factor, R promedio y R acumulado', () => {
    const stats = computeDashboardStats(rows)
    expect(stats.closedCount).toBe(5)
    expect(stats.winRate).toBe(60)
    expect(stats.profitFactor).toBe(5.11)
    expect(stats.avgR).toBe(0.44)
    expect(stats.accumulatedR).toBe(2.2)
    expect(stats.curve).toEqual([1, 0, 2, 1.6, 2.2].map((v) => expect.closeTo(v, 5)))
  })

  it('devuelve null y no inventa datos sin trades o sin R', () => {
    const empty = computeDashboardStats([])
    expect(empty.winRate).toBeNull()
    expect(empty.profitFactor).toBeNull()
    expect(empty.avgR).toBeNull()
    expect(empty.accumulatedR).toBeNull()
    const noR = computeDashboardStats([row(1, 50, null)])
    expect(noR.winRate).toBe(100)
    expect(noR.profitFactor).toBeNull()
    expect(noR.rCount).toBe(0)
  })

  it('genera puntos de polilínea acotados al viewBox', () => {
    expect(curveToPoints([], 100, 20)).toBe('')
    const points = curveToPoints([1, 2, 3], 100, 20).split(' ')
    expect(points).toHaveLength(3)
    expect(points[0].startsWith('0.0,')).toBe(true)
    expect(points[2].startsWith('100.0,')).toBe(true)
  })
})
