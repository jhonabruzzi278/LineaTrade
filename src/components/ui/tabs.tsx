import { cn } from '@/lib/utils'

export interface TabItem<T extends string> {
  value: T
  label: string
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

// Pestañas segmentadas (Reglas | Objetivos | Estrategias, Checklist | Historial…).
// Accesibles: rol tablist/tab, objetivo táctil de 44px.
export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn('inline-flex gap-1 rounded-xl border border-hairline bg-panel p-1', className)}>
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.value)}
            className={cn(
              'min-h-11 flex-1 rounded-lg px-4 font-body text-[14px] font-semibold transition-colors',
              selected ? 'bg-signal text-on-signal' : 'text-text-faint hover:text-text-primary',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
