import { useEffect, useMemo, useState } from 'react'
import { brokerCategoryLabels, popularBrokers, type Broker, type BrokerCategory } from '../../data/brokers'
import { FIELD_CLASS } from '../ui/field'
import { cn } from '@/lib/utils'

interface BrokerPickerProps {
  value?: string
  onSelect: (brokerId: string, brokerName: string) => void
}

type CategoryFilter = BrokerCategory | 'todos'

const categoryFilters: CategoryFilter[] = ['todos', 'acciones', 'forex', 'cripto', 'futuros', 'otro']

// Los 5 de mayor reconocimiento de marca entre los 37 — se muestran primero
// para no abrumar; el resto queda detrás de «Ver los N brókers» para quien
// de verdad lo necesita buscar.
const TOP_BROKER_IDS = ['interactive_brokers', 'binance', 'mt4', 'robinhood', 'coinbase']
const topBrokers = TOP_BROKER_IDS.map((id) => popularBrokers.find((broker) => broker.id === id)!)

const GRID_CLASS = 'grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-2.5'

export function BrokerPicker({ value, onSelect }: BrokerPickerProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('todos')
  const [expanded, setExpanded] = useState(false)

  // Si el bróker ya elegido no está entre los 5 destacados (p. ej. lo precargó
  // el atajo «Foto rápida» con el bróker principal del onboarding, que llega
  // async después del mount), expande para no esconder una selección existente.
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
        <p className="label-mono mb-2 lg:text-[11px]">Bróker</p>
        <div role="radiogroup" aria-label="Bróker" className={GRID_CLASS}>
          {topBrokers.map((broker) => (
            <BrokerCard key={broker.id} broker={broker} selected={value === broker.id} onSelect={onSelect} />
          ))}
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-h-[52px] items-center justify-center rounded-xl border border-dashed border-input px-3 font-body text-[14px] font-semibold text-steel transition-colors hover:border-text-faint lg:min-h-[60px] lg:text-[15px]"
          >
            <span className="lg:hidden">Ver los {popularBrokers.length}</span>
            <span className="hidden lg:inline">Ver los {popularBrokers.length} brókers</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <label htmlFor="broker-search" className="mb-1.5 block font-body text-[13px] font-semibold text-text-faint">
        Buscar bróker
      </label>
      <input
        id="broker-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej. Binance, Interactive Brokers…"
        className={cn(FIELD_CLASS, 'mb-3')}
      />

      <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Categoría de bróker">
        {categoryFilters.map((filter) => (
          <button
            key={filter}
            type="button"
            aria-pressed={category === filter}
            onClick={() => setCategory(filter)}
            className={cn(
              'min-h-10 rounded-full border px-3.5 font-body text-[13px] font-semibold transition-colors',
              category === filter ? 'border-signal bg-signal/15 text-text-primary' : 'border-input text-text-muted hover:border-text-faint',
            )}
          >
            {filter === 'todos' ? 'Todos' : brokerCategoryLabels[filter]}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Bróker" className={cn(GRID_CLASS, 'max-h-80 overflow-y-auto pr-1')}>
        {filtered.map((broker) => (
          <BrokerCard key={broker.id} broker={broker} selected={value === broker.id} onSelect={onSelect} />
        ))}

        {filtered.length === 0 && !query.trim() && (
          <p className="col-span-full py-6 text-center font-body text-[13px] text-text-faint">
            No hay brókers en esta categoría todavía.
          </p>
        )}

        {filtered.length === 0 && query.trim() && (
          <button
            type="button"
            onClick={() => onSelect(`custom:${query.trim()}`, query.trim())}
            className="col-span-full min-h-14 rounded-xl border border-dashed border-input px-3 py-4 text-center font-body text-[14px] text-text-muted transition-colors hover:border-text-faint"
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
      className={cn(
        'flex min-h-[52px] items-center gap-2.5 rounded-xl border bg-panel px-3 py-2 text-left transition-colors lg:min-h-[60px] lg:gap-3 lg:px-4',
        selected ? 'border-2 border-signal bg-signal/10 px-[11px] lg:px-[15px]' : 'border-hairline hover:border-text-faint',
      )}
    >
      <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] bg-panel-2 text-[11px] font-bold text-steel lg:h-8 lg:w-8 lg:rounded-lg lg:text-[12px]">
        {broker.name.slice(0, 2).toUpperCase()}
      </span>
      <span className="font-body text-[14px] font-semibold leading-tight text-text-primary lg:text-[15px]">{broker.name}</span>
    </button>
  )
}
