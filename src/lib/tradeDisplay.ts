interface TradeResultFields {
  pnl_r: number | null
  pnl_amount: number | null
  entry_price: number
}

// Prioridad de qué mostrar en una fila de trade: R (normalizado, lo más útil) >
// resultado en $ (si se cerró sin stop loss, no hay R pero sí hay pnl_amount) >
// precio de entrada (trade todavía abierto, sin resultado).
export function formatTradeResult(trade: TradeResultFields): string {
  if (trade.pnl_r != null) return `${trade.pnl_r > 0 ? '+' : ''}${trade.pnl_r}R`
  if (trade.pnl_amount != null) return `${trade.pnl_amount > 0 ? '+' : ''}${trade.pnl_amount}`
  return String(trade.entry_price)
}

// Solo colorea cuando hay un resultado real que mostrar — un trade abierto (mostrando
// su precio de entrada) no es ni ganancia ni pérdida, así que se queda neutro.
export function tradeResultColorClass(trade: TradeResultFields): string {
  const result = trade.pnl_r ?? trade.pnl_amount
  if (result == null) return 'text-text-muted'
  return result >= 0 ? 'text-gain' : 'text-loss'
}

// Un date-only string ("2026-03-27") se parsea como medianoche UTC — pasarlo
// directo a new Date() y mostrarlo en un huso horario negativo (América)
// adelanta la fecha un día para atrás. Se arma la fecha con componentes
// locales en vez de dejar que Date interprete el string como UTC.
export function formatDateOnly(dateOnly: string): string {
  const [year, month, day] = dateOnly.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es', { dateStyle: 'medium' })
}

// Formateadores compartidos por los paneles de métricas (Dashboard, Perfil) que leen de
// v_user_trade_stats — todos sus campos son null hasta que el usuario tiene trades
// cerrados, y el "—" es deliberado: no fabricar un 0% o un 0.0 donde no hay dato real.
export function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`
}

export function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : String(value)
}

export function formatSigned(value: number | null | undefined): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

// Para MetricCard's `tone` prop — solo se usa en métricas que son, en sí mismas, un
// resultado con signo (R promedio). Win rate y profit factor se quedan neutros a
// propósito: un profit factor de 1.1 "es positivo" pero pintarlo de verde implicaría un
// juicio de calidad que el backend no está haciendo — mismo principio que "el backend
// calcula, la IA interpreta, el color nunca opina" (ver docs/lineatrade-design-system.md).
export function signedTone(value: number | null | undefined): 'default' | 'gain' | 'loss' {
  if (value == null) return 'default'
  return value >= 0 ? 'gain' : 'loss'
}
