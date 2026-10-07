import { useState, type ReactNode } from 'react'
import { Plus } from 'lucide-react'
import { FIELD_CLASS } from '../ui/field'
import { Switch } from '../Switch'
import { cn } from '@/lib/utils'

export interface OrderTicketData {
  orderNumber: string
  orderPlacedTime: string
  priceType: '' | 'market' | 'limit'
  limitPrice: string
  bidPrice: string
  askPrice: string
  term: string
  allOrNone: boolean
}

export const emptyOrderTicket: OrderTicketData = {
  orderNumber: '',
  orderPlacedTime: '',
  priceType: '',
  limitPrice: '',
  bidPrice: '',
  askPrice: '',
  term: '',
  allOrNone: false,
}

export function hasOrderTicketData(data: OrderTicketData): boolean {
  return Boolean(
    data.orderNumber ||
      data.orderPlacedTime ||
      data.priceType ||
      data.limitPrice ||
      data.bidPrice ||
      data.askPrice ||
      data.term ||
      data.allOrNone,
  )
}

interface OrderTicketFieldsProps {
  data: OrderTicketData
  onChange: (next: OrderTicketData) => void
}

// Datos del ticket de la orden tal como los muestra el bróker — número de
// orden, hora de colocación (vs. la hora de ejecución que ya se captura en
// "Hora"), tipo Market/Limit, bid/ask al momento de operar, term, all-or-none.
// Todo opcional y colapsado por defecto: la mayoría de los traders no lo
// necesita, y no debe estorbar el flujo principal.
export function OrderTicketFields({ data, onChange }: OrderTicketFieldsProps) {
  const [expanded, setExpanded] = useState(hasOrderTicketData(data))

  function set<K extends keyof OrderTicketData>(key: K, value: OrderTicketData[K]) {
    onChange({ ...data, [key]: value })
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        className="flex min-h-11 items-center gap-2 font-body text-[14px] font-bold text-steel"
      >
        <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
        Detalles de la orden (opcional)
      </button>
    )
  }

  return (
    <div className="space-y-4 rounded-xl border border-hairline bg-panel px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="label-mono">Detalles de la orden</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          aria-expanded
          className="min-h-11 px-2 font-body text-[13px] font-semibold text-text-faint hover:text-text-primary"
        >
          Ocultar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Número de orden" htmlFor="ot-number">
          <input id="ot-number" type="text" value={data.orderNumber} onChange={(e) => set('orderNumber', e.target.value)} className={FIELD_CLASS} />
        </TicketField>
        <TicketField label="Hora de colocación" htmlFor="ot-time">
          <input id="ot-time" type="time" value={data.orderPlacedTime} onChange={(e) => set('orderPlacedTime', e.target.value)} className={FIELD_CLASS} />
        </TicketField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Tipo de orden" htmlFor="ot-type">
          <select
            id="ot-type"
            value={data.priceType}
            onChange={(e) => set('priceType', e.target.value as OrderTicketData['priceType'])}
            className={FIELD_CLASS}
          >
            <option value="">Sin especificar</option>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </TicketField>
        {data.priceType === 'limit' && (
          <TicketField label="Precio límite" htmlFor="ot-limit">
            <input id="ot-limit" type="number" step="0.001" inputMode="decimal" value={data.limitPrice} onChange={(e) => set('limitPrice', e.target.value)} className={cn(FIELD_CLASS, 'num')} />
          </TicketField>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Bid" htmlFor="ot-bid">
          <input id="ot-bid" type="number" step="0.001" inputMode="decimal" value={data.bidPrice} onChange={(e) => set('bidPrice', e.target.value)} className={cn(FIELD_CLASS, 'num')} />
        </TicketField>
        <TicketField label="Ask" htmlFor="ot-ask">
          <input id="ot-ask" type="number" step="0.001" inputMode="decimal" value={data.askPrice} onChange={(e) => set('askPrice', e.target.value)} className={cn(FIELD_CLASS, 'num')} />
        </TicketField>
      </div>

      <TicketField label="Term" htmlFor="ot-term">
        <input id="ot-term" type="text" value={data.term} onChange={(e) => set('term', e.target.value)} placeholder="Ej. Good for Day" className={FIELD_CLASS} />
      </TicketField>
      <Switch checked={data.allOrNone} onChange={(checked) => set('allOrNone', checked)} label="All or None" />
    </div>
  )
}

function TicketField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={htmlFor} className="font-body text-[12px] font-semibold text-text-faint">
        {label}
      </label>
      {children}
    </div>
  )
}
