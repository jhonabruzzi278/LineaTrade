import { ChevronRight, TrendingUp } from 'lucide-react'
import { COACH_SUGGESTIONS } from '../../lib/coachView'

interface CoachWelcomeProps {
  onPick: (question: string) => void
  disabled: boolean
}

// Pantalla de inicio: invita a preguntar y ofrece preguntas de ejemplo. Cada ejemplo
// se envía al tocarlo, como en cualquier chat.
export function CoachWelcome({ onPick, disabled }: CoachWelcomeProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-[13px] border-2 border-ink bg-signal text-on-signal shadow-pop-lg lg:h-[52px] lg:w-[52px]" aria-hidden="true">
        <TrendingUp size={24} strokeWidth={2.4} />
      </span>
      <h1 className="font-display mt-[22px] text-[28px] leading-[1.12] text-text-primary lg:mt-[26px] lg:text-[38px] lg:leading-[1.1]">¿Qué quieres entender de tus trades?</h1>
      <p className="mt-2.5 max-w-md font-body text-[14px] leading-relaxed text-text-faint lg:mt-3 lg:text-[16px]">Responde solo con datos de tu journal y cita cada uno.</p>
      <ul className="mt-7 flex w-full max-w-[720px] flex-col gap-2.5 lg:mt-8 lg:flex-row lg:flex-wrap lg:justify-center">
        {COACH_SUGGESTIONS.map((question) => (
          <li key={question} className="lg:max-w-[340px]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-input px-4 py-2.5 text-left font-body text-[14px] font-semibold text-text-muted transition-colors hover:border-text-faint hover:text-text-primary disabled:opacity-50 lg:rounded-full lg:px-5"
            >
              {question}
              <ChevronRight size={16} className="shrink-0 text-text-faint lg:hidden" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
