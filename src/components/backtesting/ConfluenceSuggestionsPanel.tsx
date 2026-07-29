import { Check, X } from 'lucide-react'
import type { DetectionCandidate } from '../../lib/confluenceDetection'

export type Suggestion = DetectionCandidate & { confidence: number; note: string }

type Props = {
  suggestions: Suggestion[]
  onAccept: (suggestion: Suggestion) => void
  onDismiss: (key: string) => void
}

// Lista de tarjetas, no un preview punteado sobre el canvas — más usable en mobile
// (nada que interpretar sobre un gráfico chico) y, a diferencia del dibujo manual, no
// depende de coordinar clics reales sobre el chart: aceptar/descartar son botones
// normales. Cada sugerencia ya trae su propia justificación determinística
// (candidate.rationale, calculada en confluenceDetection.ts) MÁS la nota de la IA
// (suggestion.note) — se muestran ambas para que quede claro que la IA solo está
// interpretando un cálculo ya hecho, no inventando el patrón.
export function ConfluenceSuggestionsPanel({ suggestions, onAccept, onDismiss }: Props) {
  if (suggestions.length === 0) return null

  return (
    <div className="border-t border-hairline bg-panel px-4 py-3">
      <div className="max-w-2xl mx-auto space-y-2">
        <p className="font-mono text-[10px] text-signal uppercase tracking-wide">Sugerencias de IA</p>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.key}
            className="flex items-start gap-3 border border-signal/30 bg-signal/5 rounded-sm px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-[13px] text-text-primary">
                {suggestion.confluenceName}{' '}
                <span className="font-mono text-[11px] text-text-faint">
                  ({Math.round(suggestion.confidence * 100)}% confianza)
                </span>
              </p>
              <p className="font-mono text-[11px] text-text-faint mt-0.5">{suggestion.note}</p>
              <p className="font-mono text-[10px] text-text-faint/70 mt-0.5">{suggestion.rationale}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onAccept(suggestion)}
                aria-label={`Aceptar sugerencia de ${suggestion.confluenceName}`}
                className="p-1.5 rounded-sm border border-gain/40 text-gain hover:bg-gain/10 transition-colors"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                onClick={() => onDismiss(suggestion.key)}
                aria-label={`Descartar sugerencia de ${suggestion.confluenceName}`}
                className="p-1.5 rounded-sm border border-hairline text-text-faint hover:text-loss hover:border-loss/40 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
