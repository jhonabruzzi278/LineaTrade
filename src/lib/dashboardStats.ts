import type { ClosedTradeRow } from './reportStats'

// Estadísticas del resumen de Inicio por periodo. Aritmética pura sobre los trades
// cerrados reales que ya trae getClosedRealTrades(): pnl_amount y pnl_r los calculó
// el trigger del backend, aquí solo se agregan (mismo criterio que /reporte). Cuando
// no hay dato, el valor es null y la UI muestra «—», nunca un 0 fabricado.

export type DashboardPeriod = '7d' | '30d' | 'all'

const DAY_MS = 24 * 60 * 60 * 1000
const PERIOD_DAYS: Record<Exclude<DashboardPeriod, 'all'>, number> = { '7d': 7, '30d': 30 }

export interface DashboardStats {
  /** Trades cerrados dentro del periodo. */
  closedCount: number
  wins: number
  /** 0–100, null sin trades cerrados. */
  winRate: number | null
  /** Ganancia bruta / pérdida bruta; null si no hay pérdidas (no se puede dividir). */
  profitFactor: number | null
  /** R promedio sobre los trades que tienen R (los que se registraron con stop). */
  avgR: number | null
  /** Cuántos trades aportan R: base real de avgR y de la curva. */
  rCount: number
  /** Suma de R del periodo; null si ningún trade tiene R. */
  accumulatedR: number | null
  /** R acumulado trade a trade, en orden cronológico. */
  curve: number[]
}

export function filterByPeriod(rows: ClosedTradeRow[], period: DashboardPeriod, now: Date = new Date()): ClosedTradeRow[] {
  if (period === 'all') return rows
  const from = now.getTime() - PERIOD_DAYS[period] * DAY_MS
  return rows.filter((row) => new Date(row.traded_at).getTime() >= from)
}

/** Trades del periodo inmediatamente anterior, de igual duración. Vacío para «Todo». */
export function previousPeriodRows(rows: ClosedTradeRow[], period: DashboardPeriod, now: Date = new Date()): ClosedTradeRow[] {
  if (period === 'all') return []
  const length = PERIOD_DAYS[period] * DAY_MS
  const to = now.getTime() - length
  const from = to - length
  return rows.filter((row) => {
    const at = new Date(row.traded_at).getTime()
    return at >= from && at < to
  })
}

function sum(values: number[]): number {
  return values.reduce((total, v) => total + v, 0)
}

export function computeDashboardStats(rows: ClosedTradeRow[]): DashboardStats {
  const sorted = [...rows].sort((a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime())
  const closedCount = sorted.length
  const wins = sorted.filter((r) => r.pnl_amount > 0).length

  const grossProfit = sum(sorted.filter((r) => r.pnl_amount > 0).map((r) => r.pnl_amount))
  const grossLoss = Math.abs(sum(sorted.filter((r) => r.pnl_amount < 0).map((r) => r.pnl_amount)))

  const rValues = sorted.map((r) => r.pnl_r).filter((v): v is number => v != null)
  let running = 0
  const curve = rValues.map((v) => {
    running += v
    return running
  })

  return {
    closedCount,
    wins,
    winRate: closedCount > 0 ? Math.round((wins / closedCount) * 100) : null,
    profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : null,
    avgR: rValues.length > 0 ? Math.round((sum(rValues) / rValues.length) * 100) / 100 : null,
    rCount: rValues.length,
    accumulatedR: rValues.length > 0 ? Math.round(sum(rValues) * 10) / 10 : null,
    curve,
  }
}

/** Puntos «x,y» de una polilínea SVG (viewBox width×height) para una curva de R. */
export function curveToPoints(curve: number[], width: number, height: number, padding = 4): string {
  if (curve.length === 0) return ''
  const values = curve.length === 1 ? [0, curve[0]] : curve
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 0)
  const span = max - min || 1
  const usableHeight = height - padding * 2
  return values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * width
      const y = padding + usableHeight - ((value - min) / span) * usableHeight
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
