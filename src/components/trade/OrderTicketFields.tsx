import { useState, type ReactNode } from 'react'

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

const inputClasses =
  'w-full bg-panel border border-hairline rounded-sm px-3 py-2.5 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors'

// Datos del ticket de la orden tal como los muestra el broker — número de
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
        className="font-body text-[13px] text-text-muted hover:text-text-primary transition-colors"
      >
        + Detalles de la orden (opcional)
      </button>
    )
  }

  return (
    <div className="border border-hairline rounded-sm bg-panel px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-text-faint tracking-wide">detalles de la orden</p>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="font-body text-[12px] text-text-faint hover:text-text-muted transition-colors"
        >
          Ocultar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Número de orden">
          <input
            type="text"
            value={data.orderNumber}
            onChange={(e) => set('orderNumber', e.target.value)}
            className={inputClasses}
          />
        </TicketField>
        <TicketField label="Hora de colocación">
          <input
            type="time"
            value={data.orderPlacedTime}
            onChange={(e) => set('orderPlacedTime', e.target.value)}
            className={inputClasses}
          />
        </TicketField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Tipo de orden">
          <select
            value={data.priceType}
            onChange={(e) => set('priceType', e.target.value as OrderTicketData['priceType'])}
            className={inputClasses}
          >
            <option value="">Sin especificar</option>
            <option value="market">Market</option>
            <option value="limit">Limit</option>
          </select>
        </TicketField>
        {data.priceType === 'limit' && (
          <TicketField label="Precio límite">
            <input
              type="number"
              step="0.001"
              value={data.limitPrice}
              onChange={(e) => set('limitPrice', e.target.value)}
              className={inputClasses}
            />
          </TicketField>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TicketField label="Bid">
          <input
            type="number"
            step="0.001"
            value={data.bidPrice}
            onChange={(e) => set('bidPrice', e.target.value)}
            className={inputClasses}
          />
        </TicketField>
        <TicketField label="Ask">
          <input
            type="number"
            step="0.001"
            value={data.askPrice}
            onChange={(e) => set('askPrice', e.target.value)}
            className={inputClasses}
          />
        </TicketField>
      </div>

      <div className="grid grid-cols-2 gap-3 items-end">
        <TicketField label="Term">
          <input
            type="text"
            value={data.term}
            onChange={(e) => set('term', e.target.value)}
            placeholder="Ej. Good for Day"
            className={inputClasses}
          />
        </TicketField>
        <label className="flex items-center gap-2 pb-2.5">
          <input
            type="checkbox"
            checked={data.allOrNone}
            onChange={(e) => set('allOrNone', e.target.checked)}
            className="accent-signal"
          />
          <span className="font-body text-[13px] text-text-muted">All or None</span>
        </label>
      </div>
    </div>
  )
}

function TicketField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="font-body text-[12px] text-text-muted block mb-1.5">{label}</label>
      {children}
    </div>
  )
}
