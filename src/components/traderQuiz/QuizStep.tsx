import type { QuizQuestion } from '../../data/traderQuiz'

interface QuizStepProps {
  question: QuizQuestion
  selectedValue: string | undefined
  onSelect: (value: string) => void
}

export function QuizStep({ question, selectedValue, onSelect }: QuizStepProps) {
  return (
    <div role="radiogroup" aria-label={question.title} className="space-y-3">
      {question.options.map((option) => {
        const selected = selectedValue === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(option.value)}
            className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-sm border transition-colors ${
              selected ? 'border-signal bg-signal/10' : 'border-hairline bg-panel hover:border-text-faint'
            }`}
          >
            <span
              className={`shrink-0 flex items-center justify-center w-4 h-4 rounded-full border ${
                selected ? 'border-signal bg-signal' : 'border-hairline'
              }`}
            />
            <span className="font-body text-[15px] text-text-primary">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
