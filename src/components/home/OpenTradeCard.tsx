import { Link } from 'react-router-dom'
import { Card } from '../ui/card'
import { Tag } from '../ui/tag'
import { buttonVariants } from '../ui/button'
import { cn } from '@/lib/utils'
import type { TradeListItem } from '../trade/TradeListRow'

interface OpenTradeCardProps {
  trade: TradeListItem
  /** Otros trades abiertos además de este. */
  extraOpen: number
}

function show(value: number | null): string {
  return value == null ? '—' : String(value)
}

// «Abierto ahora»: el trade pendiente más reciente con sus tres datos clave y el
// acceso directo para cerrarlo (el cierre vive en el detalle del trade).
export function OpenTradeCard({ trade, extraOpen }: OpenTradeCardProps) {
  return (
    <Card as="section" className="px-4 py-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <span className="label-mono">Abierto ahora</span>
        <span className="ml-auto font-body text-[15px] font-bold text-text-primary">{trade.instruments?.symbol ?? '—'}</span>
        <Tag tone={trade.side === 'long' ? 'gain' : 'loss'}>{trade.side === 'long' ? 'LONG' : 'SHORT'}</Tag>
      </div>
      <dl className="num mt-2.5 grid grid-cols-3 gap-2 text-[13px]">
        <div>
          <dt className="label-mono text-[9px]">Entrada</dt>
          <dd className="mt-1 text-text-primary">{trade.entry_price}</dd>
        </div>
        <div>
          <dt className="label-mono text-[9px]">Stop</dt>
          <dd className={cn('mt-1', trade.stop_loss != null ? 'text-loss' : 'text-text-faint')}>{show(trade.stop_loss)}</dd>
        </div>
        <div>
          <dt className="label-mono text-[9px]">Contr.</dt>
          <dd className="mt-1 text-text-primary">{show(trade.position_size)}</dd>
        </div>
      </dl>
      <Link to={`/trades/${trade.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'mt-3 w-full')}>
        Cerrar trade
      </Link>
      {extraOpen > 0 && (
        <p className="mt-2 text-center font-body text-[12px] text-text-faint">
          y {extraOpen} abierto{extraOpen === 1 ? '' : 's'} más en tu{' '}
          <Link to="/historial" className="text-steel">
            historial
          </Link>
        </p>
      )}
    </Card>
  )
}
