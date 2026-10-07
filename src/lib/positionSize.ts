// Cálculo del tamaño de posición para la lección "Tu primer trade en papermoney".
// Es aritmética pura (sin comisiones ni deslizamiento) para que la calculadora
// de la lección y sus pruebas compartan una única fuente de verdad.

export type TradeDirection = 'long' | 'short'

export interface PositionSizeInput {
  balance: number
  /** Porcentaje del saldo que aceptas perder (1 = 1 %). */
  riskPercent: number
  entry: number
  stop: number
  target: number
  direction: TradeDirection
}

export type PositionSizeIssue =
  | 'balance'
  | 'risk'
  | 'entry'
  | 'stop'
  | 'target'
  | 'stop-same-as-entry'
  | 'stop-wrong-side'
  | 'target-wrong-side'

export interface PositionSizeResult {
  /** Riesgo planeado en dinero (1R). */
  riskAmount: number
  stopDistance: number
  targetDistance: number
  /** Unidades enteras que caben en el riesgo (se redondea hacia abajo). */
  size: number
  /** Pérdida real si toca el stop (≤ riskAmount por el redondeo). */
  lossAtStop: number
  /** Ganancia real si llega al objetivo. */
  gainAtTarget: number
  /** Resultado en R si toca el stop (negativo). */
  rAtStop: number
  /** Resultado en R si llega al objetivo. */
  rAtTarget: number
  /** Relación beneficio/riesgo del plan (distancia al objetivo ÷ distancia al stop). */
  rewardToRisk: number
  /** Porcentaje de aciertos mínimo para no perder dinero con esta relación, antes de comisiones. */
  breakEvenWinRate: number
}

export type PositionSizeOutcome =
  | { ok: true; result: PositionSizeResult }
  | { ok: false; issues: PositionSizeIssue[] }

function isPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

/** Proporción mínima de aciertos para quedar en equilibrio con una relación beneficio/riesgo dada. */
export function breakEvenWinRate(rewardToRisk: number): number {
  return 1 / (1 + rewardToRisk)
}

export function calculatePositionSize(input: PositionSizeInput): PositionSizeOutcome {
  const issues: PositionSizeIssue[] = []
  if (!isPositive(input.balance)) issues.push('balance')
  if (!isPositive(input.riskPercent) || input.riskPercent > 100) issues.push('risk')
  if (!isPositive(input.entry)) issues.push('entry')
  if (!isPositive(input.stop)) issues.push('stop')
  if (!isPositive(input.target)) issues.push('target')
  if (issues.length > 0) return { ok: false, issues }

  const sign = input.direction === 'long' ? 1 : -1
  const stopDistance = (input.entry - input.stop) * sign
  const targetDistance = (input.target - input.entry) * sign
  if (input.stop === input.entry) issues.push('stop-same-as-entry')
  else if (stopDistance < 0) issues.push('stop-wrong-side')
  if (targetDistance <= 0) issues.push('target-wrong-side')
  if (issues.length > 0) return { ok: false, issues }

  const riskAmount = (input.balance * input.riskPercent) / 100
  const size = Math.floor(riskAmount / stopDistance)
  const lossAtStop = size * stopDistance
  const gainAtTarget = size * targetDistance
  const rewardToRisk = targetDistance / stopDistance

  return {
    ok: true,
    result: {
      riskAmount,
      stopDistance,
      targetDistance,
      size,
      lossAtStop,
      gainAtTarget,
      rAtStop: -lossAtStop / riskAmount,
      rAtTarget: gainAtTarget / riskAmount,
      rewardToRisk,
      breakEvenWinRate: breakEvenWinRate(rewardToRisk),
    },
  }
}

/**
 * Convierte texto escrito por una persona en número. Acepta "10,000", "10.000",
 * "10 000", "1,5", "1.5" y un "%" final. Devuelve `null` si no es un número.
 */
export function parseDecimalInput(raw: string): number | null {
  const cleaned = raw.trim().replace(/%$/, '').replace(/\s/g, '')
  if (!/^\d[\d.,]*$/.test(cleaned)) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized: string
  if (lastComma >= 0 && lastDot >= 0) {
    // El último separador es el decimal; el otro agrupa miles.
    const decimalSeparator = lastComma > lastDot ? ',' : '.'
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ','
    normalized = cleaned.split(thousandsSeparator).join('').replace(decimalSeparator, '.')
  } else if (lastDot >= 0) {
    // Un solo punto es decimal ("1.085"); varios puntos agrupan miles ("1.000.000").
    const parts = cleaned.split('.')
    normalized = parts.length > 2 ? parts.join('') : cleaned
  } else if (lastComma >= 0) {
    // "10,000" agrupa miles (formato de la calculadora); "1,5" es decimal.
    const parts = cleaned.split(',')
    const groupsOfThree = parts.slice(1).every((part) => part.length === 3)
    normalized = groupsOfThree && parts[0].length <= 3 && parts[0] !== '0' ? parts.join('') : `${parts[0]}.${parts.slice(1).join('')}`
  } else {
    normalized = cleaned
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/** "−100", "+200" o "0": signo explícito con el menos tipográfico. */
export function formatSignedAmount(value: number): string {
  const formatted = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Math.abs(value))
  if (value === 0) return '0'
  return `${value < 0 ? '−' : '+'}${formatted}`
}

/** Múltiplo de R con hasta dos decimales y signo: "−1R", "+2R", "+1.5R". */
export function formatR(value: number): string {
  const rounded = Math.round(value * 100) / 100
  const body = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 }).format(Math.abs(rounded))
  if (rounded === 0) return '0R'
  return `${rounded < 0 ? '−' : '+'}${body}R`
}
