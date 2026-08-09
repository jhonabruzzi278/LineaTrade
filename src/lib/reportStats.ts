import { supabase } from './supabase'
import type { Database } from '../types/database'

export interface ClosedTradeRow {
  traded_at: string
  pnl_amount: number
  pnl_r: number | null
  duration_minutes: number | null
  strategy_id: string | null
  strategy_name: string | null
}

type TradesSelect = Pick<
  Database['public']['Tables']['trades']['Row'],
  'traded_at' | 'pnl_amount' | 'pnl_r' | 'duration_minutes' | 'strategy_id'
> & {
  strategies: Pick<Database['public']['Tables']['strategies']['Row'], 'name'> | null
}

// Todos los trades reales (is_backtest = false) ya cerrados del usuario, ordenados
// cronológicamente — la única consulta que necesita /reporte. Todo lo demás (rachas,
// mejor/peor día-semana-modelo, drawdown, equity curve) es aritmética pura sobre estas
// filas en computeReportStats(), el mismo criterio que Historial.tsx ya usa hoy para
// su win-rate sobre el subconjunto real: pnl_amount/pnl_r ya vienen calculados por
// trg_calculate_trade_pnl() (backend), acá solo se agregan, nunca se inventan.
export async function getClosedRealTrades(userId: string): Promise<ClosedTradeRow[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('traded_at, pnl_amount, pnl_r, duration_minutes, strategy_id, strategies(name)')
    .eq('user_id', userId)
    .eq('is_backtest', false)
    .eq('status', 'closed')
    .is('deleted_at', null)
    .order('traded_at', { ascending: true })
  if (error) throw error

  const rows = (data as TradesSelect[] | null) ?? []
  return rows
    .filter((row): row is TradesSelect & { pnl_amount: number } => row.pnl_amount != null)
    .map((row) => ({
      traded_at: row.traded_at,
      pnl_amount: row.pnl_amount,
      pnl_r: row.pnl_r,
      duration_minutes: row.duration_minutes,
      strategy_id: row.strategy_id,
      strategy_name: row.strategies?.name ?? null,
    }))
}

export interface EquityPoint {
  index: number
  tradedAt: string
  pnlAmount: number
  cumulative: number
}

export interface BucketStat {
  label: string
  netPnl: number
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
  maxDrawdown: number | null
  maxDrawdownPct: number | null
  bestDay: BucketStat | null
  worstDay: BucketStat | null
  bestWeek: BucketStat | null
  worstWeek: BucketStat | null
  bestStrategy: BucketStat | null
  worstStrategy: BucketStat | null
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function computeStreaks(rows: ClosedTradeRow[]): { bestWinStreak: number | null; worstLossStreak: number | null } {
  if (rows.length === 0) return { bestWinStreak: null, worstLossStreak: null }
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

// Peor caída pico-a-valle de la curva de capital acumulada — el drawdown que sí es
// 100% real con los datos que existen (no hay MFE/MAE intra-trade guardado, así que
// no se puede calcular "drawdown promedio antes de tocar TP" como en un reporte de
// EA/MT4; ver plan de /reporte en CLAUDE.md).
function computeDrawdown(curve: EquityPoint[]): { maxDrawdown: number | null; maxDrawdownPct: number | null } {
  if (curve.length === 0) return { maxDrawdown: null, maxDrawdownPct: null }
  let peak = 0
  let maxDrawdown = 0
  let maxDrawdownPct = 0
  for (const point of curve) {
    peak = Math.max(peak, point.cumulative)
    const drawdown = peak - point.cumulative
    maxDrawdown = Math.max(maxDrawdown, drawdown)
    if (peak > 0) {
      maxDrawdownPct = Math.max(maxDrawdownPct, (drawdown / peak) * 100)
    }
  }
  return { maxDrawdown, maxDrawdownPct: peak > 0 ? maxDrawdownPct : null }
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function localWeekStart(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dow = start.getDay()
  const diffToMonday = dow === 0 ? 6 : dow - 1
  start.setDate(start.getDate() - diffToMonday)
  return start
}

interface Bucket {
  label: string
  netPnl: number
  wins: number
  total: number
}

function pickBestWorst(buckets: Map<string, Bucket>): { best: BucketStat | null; worst: BucketStat | null } {
  let best: Bucket | null = null
  let worst: Bucket | null = null
  for (const bucket of buckets.values()) {
    if (!best || bucket.netPnl > best.netPnl) best = bucket
    if (!worst || bucket.netPnl < worst.netPnl) worst = bucket
  }
  const toStat = (b: Bucket | null): BucketStat | null =>
    b ? { label: b.label, netPnl: b.netPnl, winRate: (b.wins / b.total) * 100, totalTrades: b.total } : null
  return { best: toStat(best), worst: toStat(worst) }
}

function groupByDay(rows: ClosedTradeRow[]): { best: BucketStat | null; worst: BucketStat | null } {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const date = new Date(row.traded_at)
    const key = localDayKey(date)
    const existing = buckets.get(key)
    const label = date.toLocaleDateString('es', { dateStyle: 'medium' })
    if (existing) {
      existing.netPnl += row.pnl_amount
      existing.total += 1
      if (row.pnl_amount > 0) existing.wins += 1
    } else {
      buckets.set(key, { label, netPnl: row.pnl_amount, wins: row.pnl_amount > 0 ? 1 : 0, total: 1 })
    }
  }
  return pickBestWorst(buckets)
}

function groupByWeek(rows: ClosedTradeRow[]): { best: BucketStat | null; worst: BucketStat | null } {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    const start = localWeekStart(new Date(row.traded_at))
    const key = localDayKey(start)
    const existing = buckets.get(key)
    const label = `Semana del ${start.toLocaleDateString('es', { day: 'numeric', month: 'short' })}`
    if (existing) {
      existing.netPnl += row.pnl_amount
      existing.total += 1
      if (row.pnl_amount > 0) existing.wins += 1
    } else {
      buckets.set(key, { label, netPnl: row.pnl_amount, wins: row.pnl_amount > 0 ? 1 : 0, total: 1 })
    }
  }
  return pickBestWorst(buckets)
}

function groupByStrategy(rows: ClosedTradeRow[]): { best: BucketStat | null; worst: BucketStat | null } {
  const buckets = new Map<string, Bucket>()
  for (const row of rows) {
    if (!row.strategy_id || !row.strategy_name) continue
    const existing = buckets.get(row.strategy_id)
    if (existing) {
      existing.netPnl += row.pnl_amount
      existing.total += 1
      if (row.pnl_amount > 0) existing.wins += 1
    } else {
      buckets.set(row.strategy_id, { label: row.strategy_name, netPnl: row.pnl_amount, wins: row.pnl_amount > 0 ? 1 : 0, total: 1 })
    }
  }
  return pickBestWorst(buckets)
}

export function computeReportStats(rows: ClosedTradeRow[]): ReportStats {
  const totalClosed = rows.length
  const winRows = rows.filter((r) => r.pnl_amount > 0)
  const lossRows = rows.filter((r) => r.pnl_amount <= 0)
  const streaks = computeStreaks(rows)
  const equityCurve = computeEquityCurve(rows)
  const drawdown = computeDrawdown(equityCurve)
  const byDay = groupByDay(rows)
  const byWeek = groupByWeek(rows)
  const byStrategy = groupByStrategy(rows)

  return {
    totalClosed,
    wins: winRows.length,
    losses: lossRows.length,
    winRate: totalClosed > 0 ? (winRows.length / totalClosed) * 100 : null,
    expectedValue: average(rows.map((r) => r.pnl_amount)),
    avgWin: average(winRows.map((r) => r.pnl_amount)),
    avgLoss: average(lossRows.map((r) => r.pnl_amount)),
    bestWinStreak: streaks.bestWinStreak,
    worstLossStreak: streaks.worstLossStreak,
    avgWinningRR: average(winRows.map((r) => r.pnl_r).filter((v): v is number => v != null)),
    avgDurationMinutes: average(rows.map((r) => r.duration_minutes).filter((v): v is number => v != null)),
    equityCurve,
    maxDrawdown: drawdown.maxDrawdown,
    maxDrawdownPct: drawdown.maxDrawdownPct,
    bestDay: byDay.best,
    worstDay: byDay.worst,
    bestWeek: byWeek.best,
    worstWeek: byWeek.worst,
    bestStrategy: byStrategy.best,
    worstStrategy: byStrategy.worst,
  }
}
