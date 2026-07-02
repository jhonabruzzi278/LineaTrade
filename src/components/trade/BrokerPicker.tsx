import { useMemo, useState } from 'react'
import { popularBrokers } from '../../data/brokers'

interface BrokerPickerProps {
  value?: string
  onSelect: (brokerId: string, brokerName: string) => void
}

export function BrokerPicker({ value, onSelect }: BrokerPickerProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return popularBrokers
    return popularBrokers.filter((broker) => broker.name.toLowerCase().includes(q))
  }, [query])

  return (
    <div>
      <label htmlFor="broker-search" className="font-body text-[13px] text-text-muted block mb-2">
        Buscar bróker
      </label>
      <input
        id="broker-search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej. Binance, Interactive Brokers..."
        className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors mb-6"
      />

      <p className="font-mono text-[12px] text-text-faint tracking-wide mb-3">
        o elige uno de los brokers populares
      </p>

      <div
        role="radiogroup"
        aria-label="Bróker principal"
        className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1"
      >
        {filtered.map((broker) => {
          const selected = value === broker.id
          return (
            <button
              key={broker.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(broker.id, broker.name)}
              className={`flex items-center gap-2.5 px-3 py-3 rounded-sm border text-left transition-colors ${
                selected ? 'border-signal bg-signal/10' : 'border-hairline bg-panel hover:border-text-faint'
              }`}
            >
              <span className="shrink-0 w-8 h-8 rounded-sm bg-panel-2 border border-hairline flex items-center justify-center font-mono text-[11px] text-signal">
                {broker.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-body text-[13px] text-text-primary leading-tight">{broker.name}</span>
            </button>
          )
        })}

        {filtered.length === 0 && query.trim() && (
          <button
            type="button"
            onClick={() => onSelect(`custom:${query.trim()}`, query.trim())}
            className="col-span-2 font-body text-[14px] text-text-muted py-4 text-center border border-dashed border-hairline rounded-sm hover:border-text-faint transition-colors"
          >
            Usar &ldquo;{query.trim()}&rdquo; como mi bróker
          </button>
        )}
      </div>
    </div>
  )
}
