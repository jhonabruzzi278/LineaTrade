import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  className?: string
}

// Selector de una opción entre pocas (Largo/Corto, Real/Demo/Fondeo, 7D/30D/Todo).
export function Segmented<T extends string>({ options, value, onChange, label, className }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('grid min-h-11 overflow-hidden rounded-lg border border-input', className)} style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'font-body text-[13px] font-bold transition-colors',
              selected ? 'bg-signal/20 text-text-primary shadow-[inset_0_0_0_2px_var(--color-signal)]' : 'text-text-muted hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
