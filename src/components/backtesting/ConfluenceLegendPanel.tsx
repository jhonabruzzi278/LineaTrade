import { X } from 'lucide-react'

export type LegendEntry = {
  id: string
  confluenceName: string
  color: string
}

type Props = {
  entries: LegendEntry[]
  onDelete: (id: string) => void
}

// Fila horizontal con scroll, no una barra lateral fija — este proyecto es
// mobile-first (ver CLAUDE.md, "375px-first") y Backtesting.tsx ya usa el viewport
// completo para el gráfico; una sidebar angosta hubiera competido por el mismo
// espacio que el propio replay. Mismo patrón de píldoras horizontales que
// DrawingToolbar.tsx y las categorías de Noticias.tsx.
export function ConfluenceLegendPanel({ entries, onDelete }: Props) {
  if (entries.length === 0) return null

  return (
    <div className="border-t border-hairline bg-panel-2/60 px-4 py-2">
      <div className="max-w-2xl mx-auto flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="font-mono text-[10px] text-text-faint shrink-0 uppercase tracking-wide">Confluencias</span>
        {entries.map((entry) => (
          <span
            key={entry.id}
            className="flex items-center gap-1.5 shrink-0 font-mono text-[11px] pl-2 pr-1 py-1 rounded-sm border border-hairline text-text-muted"
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} aria-hidden="true" />
            {entry.confluenceName}
            <button
              type="button"
              onClick={() => onDelete(entry.id)}
              aria-label={`Quitar ${entry.confluenceName}`}
              className="p-0.5 rounded-sm text-text-faint hover:text-loss transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
