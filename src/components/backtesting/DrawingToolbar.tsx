import { Sparkles, X } from 'lucide-react'
import type { ConfluenceType } from '../../lib/confluences'
import { isRangeShape } from '../../lib/confluences'

type Props = {
  confluenceTypes: ConfluenceType[]
  drawingType: ConfluenceType | null
  hasPendingPoint: boolean
  onSelectType: (type: ConfluenceType) => void
  onCancel: () => void
  loading?: boolean
  onSuggestAI?: () => void
  suggesting?: boolean
}

export function DrawingToolbar({
  confluenceTypes,
  drawingType,
  hasPendingPoint,
  onSelectType,
  onCancel,
  loading,
  onSuggestAI,
  suggesting,
}: Props) {
  return (
    <div className="border-t border-hairline bg-panel px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        {/* overflow-x-auto con scrollbar oculta en mobile, mismo patrón que las
            píldoras de categoría de Noticias.tsx — una fila de 9+ confluencias no
            entra fija en 375px, y a diferencia de esas píldoras esta lista sí puede
            crecer más (confluencias propias del usuario, ver Sistema). */}
        <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <span className="font-mono text-[11px] text-text-faint shrink-0">Cargando confluencias...</span>
          ) : (
            confluenceTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => onSelectType(type)}
                aria-pressed={drawingType?.id === type.id}
                title={isRangeShape(type.shape) ? `${type.name} — 2 clics (rango)` : `${type.name} — 1 clic`}
                className={`flex items-center gap-1.5 shrink-0 font-mono text-[11px] px-2.5 py-1.5 rounded-sm border transition-colors ${
                  drawingType?.id === type.id
                    ? 'border-signal text-text-primary bg-signal/10'
                    : 'border-hairline text-text-muted hover:border-text-faint'
                }`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: type.color }} aria-hidden="true" />
                {type.name}
              </button>
            ))
          )}
        </div>

        {drawingType ? (
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto shrink-0 flex items-center gap-1 font-mono text-[11px] px-2 py-1.5 rounded-sm border border-hairline text-text-faint hover:text-text-primary hover:border-text-faint transition-colors"
          >
            <X size={12} />
            {hasPendingPoint ? 'Cancelar (falta 2do punto)' : 'Cancelar'}
          </button>
        ) : (
          onSuggestAI && (
            <button
              type="button"
              onClick={onSuggestAI}
              disabled={suggesting}
              className="ml-auto shrink-0 flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded-sm border border-signal/40 text-signal hover:bg-signal/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles size={12} />
              {suggesting ? 'Analizando...' : 'Sugerir confluencias (IA)'}
            </button>
          )
        )}
      </div>
    </div>
  )
}
