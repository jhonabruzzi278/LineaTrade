// Lógica pura de la pantalla Sistema (reglas, objetivos, estrategias).

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/**
 * ¿El journal puede verificar esta regla por sí solo? Hoy existe exactamente
 * una verificación automática: si el stop loss se movió (trade_history +
 * `moved_stop_loss`, ver TradeDetail). Cualquier otra regla es revisión manual:
 * no existe un motor genérico que cruce reglas con el comportamiento real.
 */
export function isJournalVerifiedRule(title: string): boolean {
  const text = normalize(title)
  return /\bstop\b/.test(text) && /\b(mov\w*|muev\w*|desplaz\w*|cambi\w*)\b/.test(text)
}

export type ObjectiveMetric = 'win_rate' | 'profit_factor' | 'r_avg' | 'custom'

export const OBJECTIVE_METRIC_LABELS: Record<ObjectiveMetric, string> = {
  win_rate: 'Win rate',
  profit_factor: 'Profit factor',
  r_avg: 'R promedio',
  custom: 'Personalizado',
}

export const OBJECTIVE_METRICS = Object.keys(OBJECTIVE_METRIC_LABELS) as ObjectiveMetric[]

export function isObjectiveMetric(value: string): value is ObjectiveMetric {
  return (OBJECTIVE_METRICS as string[]).includes(value)
}

function trimNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

/** Valor de un objetivo con la unidad de su métrica («58%», «+0.4R», «1.3»). */
export function formatObjectiveValue(metric: string, value: number | null | undefined): string {
  if (value == null) return '—'
  const text = trimNumber(value)
  if (metric === 'win_rate') return `${text}%`
  if (metric === 'r_avg') return `${value > 0 ? '+' : ''}${text}R`
  return text
}

/** Título automático cuando el usuario no escribe uno («Win rate de 55% o más»). */
export function defaultObjectiveTitle(metric: string, target: number): string {
  if (metric === 'win_rate') return `Win rate de ${trimNumber(target)}% o más`
  if (metric === 'profit_factor') return `Profit factor de ${trimNumber(target)}`
  if (metric === 'r_avg') return `R promedio de ${formatObjectiveValue('r_avg', target)}`
  return ''
}

/** Avance 0–100 hacia la meta. Sin meta positiva o sin valor, 0. */
export function objectiveProgress(current: number | null | undefined, target: number): number {
  if (current == null || !(target > 0) || current <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/** Todas las métricas disponibles son «más es mejor»: se alcanza al igualar o superar la meta. */
export function isObjectiveReached(current: number | null | undefined, target: number): boolean {
  return current != null && current >= target
}

// Por debajo de este número de trades cerrados no se cita un win rate: con
// muestras chicas el porcentaje engaña.
export const MIN_TRADES_FOR_WIN_RATE = 10

/** Línea de resultados de una estrategia, siempre con n y sin conclusión con pocos datos. */
export function describeStrategyStats(tradeCount: number | null | undefined, winRate: number | null | undefined): string {
  const count = tradeCount ?? 0
  if (count === 0) return 'Sin trades todavía'
  const noun = `${count} trade${count === 1 ? '' : 's'}`
  if (count < MIN_TRADES_FOR_WIN_RATE || winRate == null) return `${noun} · pocos datos para concluir`
  return `${noun} · win rate ${trimNumber(winRate)}%`
}
