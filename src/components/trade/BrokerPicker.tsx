import { useEffect, useMemo, useState } from 'react'
import { brokerCategoryLabels, popularBrokers, type Broker, type BrokerCategory } from '../../data/brokers'

interface BrokerPickerProps {
  value?: string
  onSelect: (brokerId: string, brokerName: string) => void
}

type CategoryFilter = BrokerCategory | 'todos'

const categoryFilters: CategoryFilter[] = ['todos', 'acciones', 'forex', 'cripto', 'futuros', 'otro']

// Los 5 de mayor reconocimiento de marca entre los 37 — se muestran primero
// para no abrumar; el resto queda detrás de "¿No está tu bróker?" para quien
// de verdad lo necesita buscar.
const TOP_BROKER_IDS = ['interactive_brokers', 'binance', 'mt4', 'robinhood', 'coinbase']
const topBrokers = TOP_BROKER_IDS.map((id) => popularBrokers.find((broker) => broker.id === id)!)

export function BrokerPicker({ value, onSelect }: BrokerPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('todos')
  const [expanded, setExpanded] = useState(false)

  // Si el bróker ya elegido no está entre los 5 destacados (p. ej. lo precargó
  // el atajo "Foto rápida" de NuevoTrade con el bróker principal del
  // onboarding, que llega async después del mount), expande para no esconder
  // una selección que ya existe.
  useEffect(() => {
    if (value && !TOP_BROKER_IDS.includes(value)) {
      setExpanded(true)
    }
  }, [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return popularBrokers.filter((broker) => {
      const matchesQuery = !q || broker.name.toLowerCase().includes(q)
      const matchesCategory = category === 'todos' || broker.category === category
      return matchesQuery && matchesCategory
    })
  }, [query, category])

  if (!expanded) {
    return (
      <div>
        <p className="font-mono text-[12px] text-text-faint tracking-wide mb-3">Elige tu bróker</p>
        <div role="radiogroup" aria-label="Bróker principal" className="grid grid-cols-2 gap-3">
          {topBrokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} selected={value === broker.id} onSelect={onSelect} />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full mt-3 font-body text-[14px] text-text-muted py-3 text-center border border-dashed border-hairline rounded-sm hover:border-text-faint hover:text-text-primary transition-colors"
        >
          ¿No está tu bróker?
        </button>
      </div>
    )
  }

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
        className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors mb-4"
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {categoryFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setCategory(filter)}
            className={`font-mono text-[11px] tracking-wide px-3 py-1.5 rounded-sm border transition-colors ${
              category === filter
                ? 'border-signal bg-signal text-ink'
                : 'border-hairline text-text-muted hover:border-text-faint'
            }`}
          >
            {filter === 'todos' ? 'Todos' : brokerCategoryLabels[filter]}
          </button>
        ))}
      </div>

      <p className="font-mono text-[12px] text-text-faint tracking-wide mb-3">
        o elige uno de los brokers populares
      </p>

      <div
        role="radiogroup"
        aria-label="Bróker principal"
        className="grid grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1"
      >
        {filtered.map((broker) => (
          <BrokerCard key={broker.id} broker={broker} selected={value === broker.id} onSelect={onSelect} />
        ))}

        {filtered.length === 0 && !query.trim() && (
          <p className="col-span-2 font-body text-[13px] text-text-muted py-6 text-center">
            No hay brokers en esta categoría todavía.
          </p>
        )}

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

function BrokerCard({
  broker,
  selected,
  onSelect,
}: {
  broker: Broker
  selected: boolean
  onSelect: (brokerId: string, brokerName: string) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => onSelect(broker.id, broker.name)}
      className={`flex items-center gap-2.5 px-3 py-3 rounded-sm border text-left transition-all ${
        selected ? 'border-signal bg-signal/10' : 'border-hairline bg-panel hover:border-text-faint'
      }`}
    >
      <span
        className={`shrink-0 w-8 h-8 rounded-sm border flex items-center justify-center font-mono text-[11px] transition-colors ${
          selected
            ? 'bg-signal border-signal text-ink font-medium'
            : 'bg-panel-2 border-hairline text-signal'
        }`}
      >
        {selected ? '✓' : broker.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="font-body text-[13px] text-text-primary leading-tight">{broker.name}</span>
    </button>
  )
}
