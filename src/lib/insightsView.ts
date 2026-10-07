// Presentación de Insights: la suficiencia de datos se deriva SOLO del conteo de trades
// cerrados con los mismos umbrales que el backend (calculateDataSufficiency en
// supabase/functions/_shared/contextBuilder.ts): <5 insuficiente, 5–19 limitada, ≥20 suficiente.

export type DataSufficiency = 'sufficient' | 'limited' | 'insufficient'

export const MIN_TRADES_FOR_INSIGHTS = 5
export const MIN_TRADES_FOR_SUFFICIENT = 20

export function sufficiencyFromCount(closedTrades: number): DataSufficiency {
  if (closedTrades < MIN_TRADES_FOR_INSIGHTS) return 'insufficient'
  if (closedTrades < MIN_TRADES_FOR_SUFFICIENT) return 'limited'
  return 'sufficient'
}

const LABELS: Record<DataSufficiency, string> = {
  insufficient: 'Datos insuficientes todavía',
  limited: 'Datos limitados',
  sufficient: 'Datos suficientes',
}

export function sufficiencyLabel(level: DataSufficiency, closedTrades: number | null): string {
  const base = LABELS[level]
  return closedTrades == null ? base : `${base} · ${closedTrades} ${closedTrades === 1 ? 'trade' : 'trades'}`
}

/** Avance hacia el mínimo para generar insights, de 0 a 100. */
export function progressToMinimum(closedTrades: number): number {
  return Math.min(100, (closedTrades / MIN_TRADES_FOR_INSIGHTS) * 100)
}

/** `win_rate_by_strategy.0.win_rate` → `win_rate`: el último segmento legible de la ruta citada. */
export function factName(fieldPath: string): string {
  return fieldPath.split('.').pop() ?? fieldPath
}
