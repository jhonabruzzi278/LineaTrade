import { NEWS_CATEGORY_LABELS, type NewsCategory } from '../../lib/news'
import { cn } from '@/lib/utils'

export type CategoryFilter = 'all' | NewsCategory
export const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'cripto', 'forex', 'acciones', 'tecnologia', 'futuros', 'general', 'otro']

interface CategoryPillsProps {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}

// Filtro de categoría: fila desplazable en móvil, envuelta en escritorio (con mouse,
// una fila con scroll oculto deja píldoras inalcanzables).
export function CategoryPills({ value, onChange }: CategoryPillsProps) {
  return (
    <div
      role="group"
      aria-label="Categoría"
      className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:mb-6 lg:flex-wrap lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {CATEGORY_FILTERS.map((cat) => {
        const selected = value === cat
        return (
          <button
            key={cat}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(cat)}
            className={cn(
              'inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 font-body text-[13px] font-semibold transition-colors',
              selected ? 'border-ink bg-signal text-on-signal' : 'border-input text-text-muted hover:border-text-faint hover:text-text-primary',
            )}
          >
            {cat === 'all' ? 'Todo' : NEWS_CATEGORY_LABELS[cat]}
          </button>
        )
      })}
    </div>
  )
}
