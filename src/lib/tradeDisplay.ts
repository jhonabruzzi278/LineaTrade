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
  return result >= 0 ? 'text-signal' : 'text-red-400'
}
