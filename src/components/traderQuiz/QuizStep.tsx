import type { QuizQuestion } from '../../data/traderQuiz'
import { cn } from '@/lib/utils'

interface QuizStepProps {
  question: QuizQuestion
  selectedValue: string | undefined
  onSelect: (value: string) => void
}

// Respuestas como radios de al menos 56px: una opción por fila, seleccionada con
// borde y relleno de marca (no solo con color: el círculo interior también cambia).
export function QuizStep({ question, selectedValue, onSelect }: QuizStepProps) {
  return (
    <div role="radiogroup" aria-label={question.title} className="flex flex-col gap-2.5">
      {question.options.map((option) => {
        const selected = selectedValue === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={cn(
              'flex min-h-[58px] w-full items-center gap-3.5 rounded-xl border px-4 py-3 text-left font-body text-[15px] font-semibold text-text-primary transition-colors',
              selected ? 'border-2 border-signal bg-signal/10' : 'border-hairline bg-panel hover:border-text-faint',
            )}
          >
            <span
              className={cn('flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-signal' : 'border-text-faint/60')}
              aria-hidden="true"
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-signal" />}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
