import { formatTradeResult } from './tradeDisplay'

// Formato de presentación de las filas de trade del rediseño (Inicio, Historial y
// detalle). Vive aparte de tradeDisplay.ts para no cambiar el contrato de
// formatTradeResult, que ya tiene pruebas de regresión.

const MINUS = '−'

interface ResultFields {
  pnl_r: number | null
  pnl_amount: number | null
  entry_price: number
}

/** Número con signo tipográfico (menos real) y decimales fijos: «+0.60», «−1.00». */
export function formatSignedFixed(value: number, decimals = 2): string {
  const abs = Math.abs(value).toFixed(decimals)
  if (value > 0) return `+${abs}`
  if (value < 0) return `${MINUS}${abs}`
  return abs
}

/** R con dos decimales y signo: «+2.10R». */
export function formatR(value: number): string {
  return `${formatSignedFixed(value, 2)}R`
}

// Prioridad igual a formatTradeResult (R > monto > precio de entrada), pero con el
// formato del diseño: dos decimales y signo tipográfico.
export function formatRowResult(trade: ResultFields): string {
  if (trade.pnl_r != null) return formatR(trade.pnl_r)
  if (trade.pnl_amount != null) return formatSignedFixed(trade.pnl_amount, 2)
  return formatTradeResult(trade)
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/** «hoy 09:41» si es de hoy; si no, «02 oct 10:41». */
export function formatTradeMoment(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (sameLocalDay(date, now)) return `hoy ${time}`
  const day = date.toLocaleDateString('es', { day: '2-digit', month: 'short' }).replace(/\./g, '')
  return `${day} ${time}`
}

/** «1 h 12 min», «38 min», «2 h». Null si no hay duración guardada. */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes < 0) return null
  const total = Math.round(minutes)
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours} h`
  return `${hours} h ${rest} min`
}

const MARKET_LABELS: Record<string, string> = {
  stock: 'Acciones',
  options: 'Opciones',
  forex: 'Forex',
  crypto: 'Cripto',
  futures: 'Futuros',
  index: 'Índices',
  cfd: 'CFD',
}

/** Nombre en español del mercado de un instrumento; devuelve el valor tal cual si no se conoce. */
export function marketLabel(market: string | null | undefined): string | null {
  if (!market) return null
  return MARKET_LABELS[market] ?? market
}

export interface PlannedRisk {
  /** Distancia de entrada a stop, en unidades de precio. */
  riskDistance: number
  /** Relación beneficio/riesgo planificada; null sin take profit. */
  rewardRisk: number | null
}

// Riesgo planificado según lo que el usuario escribió (entrada, stop, take profit):
// aritmética directa de sus propios datos, no una métrica del backend.
export function plannedRisk(entry: number, stop: number | null, takeProfit: number | null): PlannedRisk | null {
  if (stop == null) return null
  const riskDistance = Math.abs(entry - stop)
  if (riskDistance === 0) return null
  const rewardRisk = takeProfit != null ? Math.abs(takeProfit - entry) / riskDistance : null
  return { riskDistance, rewardRisk }
}
