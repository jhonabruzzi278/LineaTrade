import { Link } from 'react-router-dom'
import { Tag } from '../ui/tag'
import { tradeResultColorClass } from '../../lib/tradeDisplay'
import { formatRowResult, formatTradeMoment } from '../../lib/tradeRowDisplay'
import { cn } from '@/lib/utils'
import type { Database } from '../../types/database'

export type TradeListItem = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
  strategies?: Pick<Database['public']['Tables']['strategies']['Row'], 'name'> | null
}

// Fila compartida por Inicio ("Actividad reciente") e Historial. En móvil son dos
// líneas con un riel de color a la izquierda según el lado (long = ganancia, short
// = pérdida: dirección, no resultado); en escritorio (lg) es una fila de tabla con
// columnas. El color del resultado, en cambio, sí es P&L.
//
// La entrada escalonada solo se aplica a las primeras filas: más allá, el retraso
// es ruido en una lista larga.
const STAGGER_LIMIT = 12
const STAGGER_STEP_SECONDS = 0.04

const RAIL_CLASS: Record<TradeListItem['side'], string> = {
  long: 'bg-gain',
  short: 'bg-loss',
}

const SIDE_LABEL: Record<TradeListItem['side'], string> = { long: 'LONG', short: 'SHORT' }

// Plantillas de columnas de la tabla de escritorio: Inicio (5) e Historial (6).
const GRID_HOME = 'lg:grid-cols-[1fr_0.7fr_1fr_1.3fr_0.8fr]'
const GRID_HISTORY = 'lg:grid-cols-[1.1fr_0.7fr_1.1fr_1.4fr_0.8fr_0.9fr]'

interface TradeListRowProps {
  trade: TradeListItem
  index: number
  /** Historial agrega la columna «Estado» en la tabla de escritorio. */
  showStatus?: boolean
}

export function TradeTableHeader({ showStatus = false }: { showStatus?: boolean }) {
  return (
    <div
      className={cn(
        'label-mono hidden items-center border-b border-hairline bg-ink/40 px-5 py-3 lg:grid',
        showStatus ? GRID_HISTORY : GRID_HOME,
      )}
    >
      <span>Instrumento</span>
      <span>Lado</span>
      <span>Fecha</span>
      <span>Estrategia</span>
      {showStatus && <span>Estado</span>}
      <span className="text-right">Resultado</span>
    </div>
  )
}

export function TradeListRow({ trade, index, showStatus = false }: TradeListRowProps) {
  const isStaggered = index < STAGGER_LIMIT
  const symbol = trade.instruments?.symbol ?? '—'
  const moment = formatTradeMoment(trade.traded_at)
  const result = formatRowResult(trade)
  const resultClass = tradeResultColorClass(trade)
  const strategy = trade.strategies?.name ?? null
  const isOpen = trade.status === 'open'

  return (
    <Link
      to={`/trades/${trade.id}`}
      className={cn(
        'group relative block px-5 py-3.5 transition-colors hover:bg-panel-2/60 lg:grid lg:min-h-[52px] lg:items-center lg:py-0',
        showStatus ? GRID_HISTORY : GRID_HOME,
        isStaggered && 'reveal-up',
      )}
      style={isStaggered ? { animationDelay: `${index * STAGGER_STEP_SECONDS}s` } : undefined}
    >
      <span
        className={cn('absolute bottom-3 left-0 top-3 w-[3px] rounded-r-sm lg:hidden', RAIL_CLASS[trade.side])}
        aria-hidden="true"
      />

      {/* Móvil: línea 1 = símbolo + etiquetas / resultado; línea 2 = fecha / estado. */}
      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-body text-[16px] font-bold text-text-primary">{symbol}</span>
            <Tag tone={trade.side === 'long' ? 'gain' : 'loss'}>{SIDE_LABEL[trade.side]}</Tag>
            {trade.is_backtest && <Tag>Práctica</Tag>}
          </div>
          <span className={cn('num shrink-0 text-[15px]', resultClass)}>{result}</span>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 font-body text-[12px] text-text-faint">
          <span className="num">{moment}</span>
          {isOpen ? <Tag tone="brand">Abierto</Tag> : <span>cerrado</span>}
        </div>
      </div>

      {/* Escritorio: fila de tabla. */}
      <span className="hidden min-w-0 items-center gap-2 font-body text-[14px] font-bold text-text-primary lg:flex">
        <span className="truncate">{symbol}</span>
        {trade.is_backtest && <Tag>Práctica</Tag>}
      </span>
      <span className="num hidden text-[14px] text-text-faint lg:block">{trade.side}</span>
      <span className="num hidden text-[14px] text-text-faint lg:block">{moment}</span>
      <span className={cn('hidden truncate font-body text-[14px] lg:block', strategy ? 'text-text-faint' : 'text-text-faint/70')}>
        {strategy ?? 'Sin estrategia'}
      </span>
      {showStatus && (
        <span className="hidden font-body text-[14px] text-text-faint lg:block">
          {isOpen ? <Tag tone="brand">Abierto</Tag> : 'cerrado'}
        </span>
      )}
      <span className={cn('num hidden text-right text-[14px] lg:block', resultClass)}>{result}</span>
    </Link>
  )
}
