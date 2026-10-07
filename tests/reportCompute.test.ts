import { describe, expect, it } from 'vitest'
import {
  computeReportStats,
  filterByPeriod,
  formatWeekRange,
  type ClosedTradeRow,
} from '../src/lib/reportCompute'
import { formatDuration, formatDrawdown, formatR, formatSignedDecimal } from '../src/lib/reportFormat'

// Fechas con hora local al mediodía para que el día de la semana no dependa del huso.
function row(date: string, pnl: number, r: number | null, extra: Partial<ClosedTradeRow> = {}): ClosedTradeRow {
  return {
    traded_at: new Date(`${date}T12:00:00`).toISOString(),
    pnl_amount: pnl,
    pnl_r: r,
    duration_minutes: null,
    strategy_id: null,
    strategy_name: null,
    ...extra,
  }
}

describe('computeReportStats', () => {
  it('devuelve nulls y cero cuando no hay trades', () => {
    const stats = computeReportStats([])
    expect(stats.totalClosed).toBe(0)
    expect(stats.winRate).toBeNull()
    expect(stats.bestDay).toBeNull()
    expect(stats.maxDrawdown).toBeNull()
    expect(stats.totalPnl).toBe(0)
  })

  it('calcula rachas, win rate, drawdown y curva sobre un dataset conocido', () => {
    // 2026-09-21 es lunes.
    const rows = [
      row('2026-09-21', 100, 1),
      row('2026-09-22', 100, 1),
      row('2026-09-23', -50, -1),
      row('2026-09-24', -50, -1),
      row('2026-09-25', -50, -1),
      row('2026-09-26', 50, 0.5),
    ]
    const stats = computeReportStats(rows)
    expect(stats.totalClosed).toBe(6)
    expect(stats.winRate).toBeCloseTo(50)
    expect(stats.bestWinStreak).toBe(2)
    expect(stats.worstLossStreak).toBe(3)
    expect(stats.totalPnl).toBe(100)
    // Pico 200, valle 50: caída de 150 = 75% del pico.
    expect(stats.maxDrawdown).toBe(150)
    expect(stats.maxDrawdownPct).toBeCloseTo(75)
    expect(stats.expectedValue).toBeCloseTo(100 / 6)
    expect(stats.avgWinningRR).toBeCloseTo((1 + 1 + 0.5) / 3)
  })

  it('agrupa por día de la semana y expresa en R cuando todos los trades tienen R', () => {
    const rows = [
      row('2026-09-22', 100, 2), // martes
      row('2026-09-29', 100, 1), // martes
      row('2026-09-25', -60, -1), // viernes
    ]
    const stats = computeReportStats(rows)
    expect(stats.bestDay).toMatchObject({ label: 'Martes', unit: 'r', value: 3, totalTrades: 2 })
    expect(stats.worstDay).toMatchObject({ label: 'Viernes', unit: 'r', value: -1, totalTrades: 1 })
  })

  it('cae a moneda si algún trade no tiene R (no mezcla unidades)', () => {
    const rows = [row('2026-09-22', 100, 2), row('2026-09-25', -60, null)]
    const stats = computeReportStats(rows)
    expect(stats.bestDay?.unit).toBe('amount')
    expect(stats.worstDay?.value).toBe(-60)
  })

  it('con un solo grupo no repite el mismo como peor', () => {
    const stats = computeReportStats([row('2026-09-22', 100, 2), row('2026-09-29', -40, -1)])
    expect(stats.bestDay?.label).toBe('Martes')
    expect(stats.worstDay).toBeNull()
  })

  it('agrupa por semana (lunes a domingo) y por modelo ignorando trades sin estrategia', () => {
    const rows = [
      row('2026-09-21', 100, 1, { strategy_id: 'a', strategy_name: 'Apertura NY' }),
      row('2026-09-28', -40, -1, { strategy_id: 'b', strategy_name: 'Pullback a VWAP' }),
      row('2026-09-29', 20, 0.2),
    ]
    const stats = computeReportStats(rows)
    expect(stats.bestWeek?.label).toBe('21–27 sep')
    expect(stats.bestStrategy?.label).toBe('Apertura NY')
    expect(stats.worstStrategy?.label).toBe('Pullback a VWAP')
  })
})

describe('filterByPeriod', () => {
  const now = new Date('2026-09-30T12:00:00')
  const rows = [row('2026-09-01', 10, 1), row('2026-09-15', 10, 1), row('2026-09-28', 10, 1)]

  it('todo devuelve las mismas filas', () => {
    expect(filterByPeriod(rows, 'all', now)).toHaveLength(3)
  })
  it('30d y 7d recortan por fecha', () => {
    expect(filterByPeriod(rows, '30d', now)).toHaveLength(3)
    expect(filterByPeriod(rows, '7d', now)).toHaveLength(1)
  })
})

describe('formatWeekRange', () => {
  it('cruza de mes', () => {
    expect(formatWeekRange(new Date(2026, 8, 28))).toBe('28 sep–4 oct')
  })
})

describe('reportFormat', () => {
  it('usa menos tipográfico y decimales fijos', () => {
    expect(formatSignedDecimal(42.1)).toBe('+42.10')
    expect(formatSignedDecimal(-96.4)).toBe('−96.40')
    expect(formatSignedDecimal(0)).toBe('0.00')
    expect(formatSignedDecimal(null)).toBe('—')
    expect(formatR(-3.1)).toBe('−3.1R')
    expect(formatR(6.2)).toBe('+6.2R')
    expect(formatDrawdown(312.5)).toBe('−312.50')
  })
  it('formatea duración', () => {
    expect(formatDuration(65)).toBe('1 h 05 min')
    expect(formatDuration(38)).toBe('38 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(null)).toBe('—')
  })
})
