// Aritmética pura de /reporte: sin acceso a red ni a Supabase, para poder probarla.
// Todo sale de pnl_amount / pnl_r que el trigger del backend ya calculó; acá solo se
// agrega, nunca se inventa. Una agrupación sin datos devuelve null (la UI muestra «—»).

export interface ClosedTradeRow {
  traded_at: string
  pnl_amount: number
  pnl_r: number | null
  duration_minutes: number | null
  strategy_id: string | null
  strategy_name: string | null
}

export interface EquityPoint {
  index: number
  tradedAt: string
  pnlAmount: number
  cumulative: number
}

export type BucketUnit = 'r' | 'amount'

export interface BucketStat {
  label: string
  /** Suma de R (unit = 'r') o de P&L en moneda (unit = 'amount') del grupo. */
  value: number
  unit: BucketUnit
  winRate: number
  totalTrades: number
}

export interface ReportStats {
  totalClosed: number
  wins: number
  losses: number
  winRate: number | null
  expectedValue: number | null
  avgWin: number | null
  avgLoss: number | null
  bestWinStreak: number | null
  worstLossStreak: number | null
  avgWinningRR: number | null
  avgDurationMinutes: number | null
  equityCurve: EquityPoint[]
  totalPnl: number
  maxDrawdown: number | null
  maxDrawdownPct: number | null
  bestDay: BucketStat | null
  worstDay: BucketStat | null
  bestWeek: BucketStat | null
  worstWeek: BucketStat | null
  bestStrategy: BucketStat | null
  worstStrategy: BucketStat | null
}

export type ReportPeriod = '7d' | '30d' | 'all'

const PERIOD_DAYS: Record<Exclude<ReportPeriod, 'all'>, number> = { '7d': 7, '30d': 30 }
const DAY_MS = 24 * 60 * 60 * 1000

export function filterByPeriod(rows: ClosedTradeRow[], period: ReportPeriod, now: Date = new Date()): ClosedTradeRow[] {
  if (period === 'all') return rows
  const since = now.getTime() - PERIOD_DAYS[period] * DAY_MS
  return rows.filter((row) => new Date(row.traded_at).getTime() >= since)
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function computeStreaks(rows: ClosedTradeRow[]): { bestWinStreak: number | null; worstLossStreak: number | null } {
  let bestWin = 0
  let worstLoss = 0
  let currentWin = 0
  let currentLoss = 0
  for (const row of rows) {
    if (row.pnl_amount > 0) {
      currentWin += 1
      currentLoss = 0
    } else {
      currentLoss += 1
      currentWin = 0
    }
    bestWin = Math.max(bestWin, currentWin)
    worstLoss = Math.max(worstLoss, currentLoss)
  }
  return { bestWinStreak: bestWin || null, worstLossStreak: worstLoss || null }
}

function computeEquityCurve(rows: ClosedTradeRow[]): EquityPoint[] {
  let cumulative = 0
  return rows.map((row, index) => {
    cumulative += row.pnl_amount
    return { index: index + 1, tradedAt: row.traded_at, pnlAmount: row.pnl_amount, cumulative }
  })
}

// Peor caída pico-a-valle de la curva de capital acumulada: el drawdown que sí es
// real con los datos guardados (no hay MFE/MAE intra-trade).
function computeDrawdown(curve: EquityPoint[]): { maxDrawdown: number | null; maxDrawdownPct: number | null } {
  if (curve.length === 0) return { maxDrawdown: null, maxDrawdownPct: null }
  let peak = 0
  let maxDrawdown = 0
  let maxDrawdownPct = 0
  for (const point of curve) {
    peak = Math.max(peak, point.cumulative)
    const drawdown = peak - point.cumulative
    maxDrawdown = Math.max(maxDrawdown, drawdown)
    if (peak > 0) maxDrawdownPct = Math.max(maxDrawdownPct, (drawdown / peak) * 100)
  }
  return { maxDrawdown, maxDrawdownPct: peak > 0 ? maxDrawdownPct : null }
}

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffToMonday = start.getDay() === 0 ? 6 : start.getDay() - 1
  start.setDate(start.getDate() - diffToMonday)
  return start
}

/** «22–28 sep» o, si cruza de mes, «29 sep–5 oct». */
export function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  if (weekStart.getMonth() === end.getMonth()) {
    return `${weekStart.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]}`
  }
  return `${weekStart.getDate()} ${MONTHS[weekStart.getMonth()]}–${end.getDate()} ${MONTHS[end.getMonth()]}`
}

interface Bucket {
  label: string
  value: number
  wins: number
  total: number
}

function addToBucket(buckets: Map<string, Bucket>, key: string, label: string, value: number, isWin: boolean): void {
  const existing = buckets.get(key)
  if (existing) {
    existing.value += value
    existing.total += 1
    if (isWin) existing.wins += 1
  } else {
    buckets.set(key, { label, value, wins: isWin ? 1 : 0, total: 1 })
  }
}

// Mejor y peor grupo. Con un solo grupo no hay con qué compararlo: «peor» queda en
// null en vez de repetir el mismo grupo en las dos tarjetas.
function pickBestWorst(buckets: Map<string, Bucket>, unit: BucketUnit): { best: BucketStat | null; worst: BucketStat | null } {
  const list = [...buckets.values()]
  if (list.length === 0) return { best: null, worst: null }
  const toStat = (b: Bucket): BucketStat => ({
    label: b.label,
    value: b.value,
    unit,
    winRate: (b.wins / b.total) * 100,
    totalTrades: b.total,
  })
  const sorted = [...list].sort((a, b) => b.value - a.value)
  return {
    best: toStat(sorted[0]),
    worst: sorted.length > 1 ? toStat(sorted[sorted.length - 1]) : null,
  }
}

function groupRows(
  rows: ClosedTradeRow[],
  unit: BucketUnit,
  keyOf: (row: ClosedTradeRow) => { key: string; label: string } | null,
): { best: BucketStat | null; worst: BucketStat | null } {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const group = keyOf(row)
    if (!group) continue
    const value = unit === 'r' ? (row.pnl_r ?? 0) : row.pnl_amount
    addToBucket(buckets, group.key, group.label, value, row.pnl_amount > 0)
  }
  return pickBestWorst(buckets, unit)
}

export function computeReportStats(rows: ClosedTradeRow[]): ReportStats {
  const winRows = rows.filter((r) => r.pnl_amount > 0)
  const lossRows = rows.filter((r) => r.pnl_amount <= 0)
  const streaks = computeStreaks(rows)
  const equityCurve = computeEquityCurve(rows)
  const drawdown = computeDrawdown(equityCurve)
  // Las comparaciones por día/semana/modelo se expresan en R solo si todos los trades
  // del periodo lo tienen; si no, en moneda — nunca se mezclan las dos unidades.
  const unit: BucketUnit = rows.length > 0 && rows.every((r) => r.pnl_r != null) ? 'r' : 'amount'

  const byWeekday = groupRows(rows, unit, (row) => {
    const day = new Date(row.traded_at).getDay()
    return { key: String(day), label: WEEKDAYS[day] }
  })
  const byWeek = groupRows(rows, unit, (row) => {
    const start = localWeekStart(new Date(row.traded_at))
    return { key: localDayKey(start), label: formatWeekRange(start) }
  })
  const byStrategy = groupRows(rows, unit, (row) =>
    row.strategy_id && row.strategy_name ? { key: row.strategy_id, label: row.strategy_name } : null,
  )

  return {
    totalClosed: rows.length,
    wins: winRows.length,
    losses: lossRows.length,
    winRate: rows.length > 0 ? (winRows.length / rows.length) * 100 : null,
    expectedValue: average(rows.map((r) => r.pnl_amount)),
    avgWin: average(winRows.map((r) => r.pnl_amount)),
    avgLoss: average(lossRows.map((r) => r.pnl_amount)),
    bestWinStreak: streaks.bestWinStreak,
    worstLossStreak: streaks.worstLossStreak,
    avgWinningRR: average(winRows.map((r) => r.pnl_r).filter((v): v is number => v != null)),
    avgDurationMinutes: average(rows.map((r) => r.duration_minutes).filter((v): v is number => v != null)),
    equityCurve,
    totalPnl: equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].cumulative : 0,
    maxDrawdown: drawdown.maxDrawdown,
    maxDrawdownPct: drawdown.maxDrawdownPct,
    bestDay: byWeekday.best,
    worstDay: byWeekday.worst,
    bestWeek: byWeek.best,
    worstWeek: byWeek.worst,
    bestStrategy: byStrategy.best,
    worstStrategy: byStrategy.worst,
  }
}
