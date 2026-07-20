import { Link } from 'react-router-dom'
import { formatTradeResult, tradeResultColorClass } from '../../lib/tradeDisplay'
import type { Database } from '../../types/database'

type Trade = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}

// Fila compartida por Dashboard ("Últimos trades") e Historial (lista completa) — antes
// cada pantalla tenía su propia copia casi idéntica de este markup. El riel de color a la
// izquierda (gain/loss según `side`) es la única pieza nueva de jerarquía: reusa el mismo
// par semántico que ya pinta el badge y el resultado, no introduce un tercer significado.
//
// La entrada escalonada (`reveal-up` + delay por índice) solo se aplica a las primeras
// filas — más allá de eso el delay se vuelve ruido, no pulido, en una lista larga como la
// de Historial sin límite de resultados.
const STAGGER_LIMIT = 12
const STAGGER_STEP_SECONDS = 0.04

const RAIL_CLASS: Record<Trade['side'], string> = {
  long: 'bg-gain/50 group-hover:bg-gain',
  short: 'bg-loss/50 group-hover:bg-loss',
}

interface TradeListRowProps {
  trade: Trade
  index: number
  showDate?: boolean
}

export function TradeListRow({ trade, index, showDate = false }: TradeListRowProps) {
  const isStaggered = index < STAGGER_LIMIT

  return (
    <Link
      to={`/trades/${trade.id}`}
      className={`group relative flex items-center justify-between gap-3 pl-5 pr-5 py-4 transition-colors hover:bg-panel-2/70 ${
        isStaggered ? 'reveal-up' : ''
      }`}
      style={isStaggered ? { animationDelay: `${index * STAGGER_STEP_SECONDS}s` } : undefined}
    >
      <span
        className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-200 ${RAIL_CLASS[trade.side]}`}
        aria-hidden="true"
      />
      <div className="flex items-center gap-3 min-w-0">
        {showDate && (
          <span className="font-mono text-[12px] text-text-faint w-24 shrink-0">
            {new Date(trade.traded_at).toLocaleDateString('es', { dateStyle: 'medium' })}
          </span>
        )}
        <span className="font-display text-[15px] text-text-primary tracking-tight">
          {trade.instruments?.symbol ?? '—'}
        </span>
        <span
          className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border ${
            trade.side === 'long' ? 'border-gain/40 text-gain' : 'border-loss/40 text-loss'
          }`}
        >
          {trade.side}
        </span>
        <span className="font-mono text-[11px] text-text-faint">{trade.status}</span>
      </div>
      <span className="flex items-center gap-2 shrink-0">
        <span className={`font-mono text-[13px] tabular-nums ${tradeResultColorClass(trade)}`}>
          {formatTradeResult(trade)}
        </span>
        <span className="font-mono text-[13px] text-text-faint opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-signal">
          →
        </span>
      </span>
    </Link>
  )
}
