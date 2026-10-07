import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PROCESS_REVIEW_QUESTIONS } from '../../data/lessons/primerTradePapermoney'
import { summarizeProcessReview } from '../../lib/processReview'

interface ProcessReviewProps {
  answers: Readonly<Record<string, boolean>>
  onAnswer: (questionId: string, value: boolean) => void
  onSave: () => void
  onReset: () => void
  saved: boolean
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | undefined; onChange: (value: boolean) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex shrink-0 gap-2">
      {[true, false].map((option) => (
        <button
          key={String(option)}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={cn(
            'min-h-11 min-w-16 flex-1 rounded-lg border font-body text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === option ? 'border-signal bg-signal/15 text-text-primary' : 'border-input text-text-muted hover:text-text-primary',
          )}
        >
          {option ? 'Sí' : 'No'}
        </button>
      ))}
    </div>
  )
}

// Paso 5 de la lección de papermoney: cinco preguntas Sí/No sobre cómo se
// ejecutó el trade. No pide ni muestra el resultado: se revisa el proceso.
export function ProcessReview({ answers, onAnswer, onSave, onReset, saved }: ProcessReviewProps) {
  const summary = summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, answers)

  return (
    <div className="mt-3.5">
      <p className="font-body text-[15px] text-text-muted">Responde sobre cómo ejecutaste, no sobre cuánto ganaste.</p>
      <div role="group" aria-label="Revisión del proceso" className="mt-2 border-b border-hairline">
        {PROCESS_REVIEW_QUESTIONS.map((question) => (
          <div key={question.id} className="flex flex-col gap-2.5 border-t border-hairline py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="font-body text-[15px] text-text-primary">{question.text}</span>
            <YesNo label={question.ariaLabel} value={answers[question.id]} onChange={(value) => onAnswer(question.id, value)} />
          </div>
        ))}
      </div>

      <div aria-live="polite" className="mt-5">
        {summary ? (
          <>
            <div className={cn('max-w-xs rounded-xl border bg-panel p-4', summary.flaws.length === 0 ? 'border-hairline' : 'border-spark/40')}>
              <p className="label-mono">Proceso</p>
              <p className="num mt-2 text-[28px] text-text-primary">{summary.followed} de {summary.total}</p>
              <p className="mt-1 font-body text-[13px] text-text-faint">
                {summary.flaws.length === 0 ? 'Seguiste el plan completo' : `Falló: ${summary.flaws.join('; ')}`}
              </p>
            </div>
            <p className="mt-4 font-body text-[15px] leading-[1.7] text-text-muted sm:text-[16px]">{summary.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button type="button" onClick={onSave}>Guardar revisión</Button>
              <Button type="button" variant="outline" onClick={onReset}>Repetir con otro plan</Button>
              {saved && <span role="status" className="font-body text-[13px] font-semibold text-steel">Revisión guardada en este dispositivo.</span>}
            </div>
          </>
        ) : (
          <p className="font-body text-[13px] text-text-faint">Responde las cinco preguntas para ver tu resumen del proceso.</p>
        )}
      </div>
    </div>
  )
}
