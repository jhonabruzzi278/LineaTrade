import { useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { useLessonPractice } from '../../hooks/useLessonPractice'
import type { LessonStep } from '../../data/lessonTypes'
import { PositionSizeInline, PositionSizeSheet, SavedPlanSummary } from './PositionSizeCalculator'
import { useCalculatorForm } from './positionSizeForm'
import { ProcessReview } from './ProcessReview'
import { RichText } from './RichText'

export type LessonPracticeApi = ReturnType<typeof useLessonPractice>

function PlanWidget({ practice }: { practice: LessonPracticeApi }) {
  const form = useCalculatorForm(practice.state.plan)
  const [sheetOpen, setSheetOpen] = useState(false)
  const openerRef = useRef<HTMLButtonElement>(null)
  const saved = practice.state.doneSteps.includes('plan')
  const plan = form.buildPlan()

  function closeSheet() {
    setSheetOpen(false)
    openerRef.current?.focus()
  }

  return (
    <>
      <div className="hidden lg:block"><PositionSizeInline form={form} saved={saved} onSave={practice.savePlan} /></div>
      {plan ? (
        <SavedPlanSummary plan={plan} openerRef={openerRef} onOpen={() => setSheetOpen(true)} />
      ) : (
        <div className="mt-3.5 lg:hidden">
          <button ref={openerRef} type="button" onClick={() => setSheetOpen(true)} className="min-h-12 w-full rounded-[10px] border border-input font-body text-[14px] font-bold text-text-primary">Abrir la calculadora</button>
        </div>
      )}
      {saved && <p role="status" className="mt-2 font-body text-[13px] font-semibold text-steel lg:hidden">Plan guardado en este dispositivo.</p>}
      {sheetOpen && (
        <PositionSizeSheet
          form={form}
          onClose={closeSheet}
          onSave={(next) => {
            practice.savePlan(next)
            closeSheet()
          }}
        />
      )}
    </>
  )
}

function ReviewWidget({ practice }: { practice: LessonPracticeApi }) {
  return (
    <ProcessReview
      answers={practice.state.answers}
      onAnswer={practice.setAnswer}
      onSave={() => practice.setStepDone('revision', true)}
      onReset={practice.resetReview}
      saved={practice.state.doneSteps.includes('revision')}
    />
  )
}

function StepMarker({ index, done, current, onToggle }: { index: number; done: boolean; current: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? `Paso ${index + 1} hecho. Tocar para desmarcar` : `Marcar el paso ${index + 1} como hecho`}
      onClick={onToggle}
      className={cn(
        'num relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[13px] font-semibold transition-colors',
        'after:absolute after:-inset-1 after:content-[""] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        done && 'border-signal bg-signal text-on-signal',
        !done && current && 'border-signal bg-signal/20 text-text-primary',
        !done && !current && 'border-hairline bg-ink text-text-muted',
      )}
    >
      {done ? <Check className="h-4 w-4" strokeWidth={3.2} aria-hidden="true" /> : index + 1}
    </button>
  )
}

export function LessonSteps({ steps, practice }: { steps: readonly LessonStep[]; practice: LessonPracticeApi }) {
  const doneSteps = practice.state.doneSteps
  const currentId = steps.find((step) => !doneSteps.includes(step.id))?.id

  return (
    <ol className="mt-8">
      {steps.map((step, index) => {
        const done = doneSteps.includes(step.id)
        const isLast = index === steps.length - 1
        return (
          <li key={step.id} id={`paso-${step.id}`} className="relative grid grid-cols-[36px_minmax(0,1fr)] gap-[18px] pb-[30px] scroll-mt-6">
            {!isLast && <span aria-hidden="true" className="absolute top-10 bottom-0.5 left-[17px] w-0.5 bg-hairline" />}
            <StepMarker index={index} done={done} current={step.id === currentId} onToggle={() => practice.setStepDone(step.id, !done)} />
            <div className="min-w-0">
              <h3 className="mt-1.5 font-body text-[17px] font-bold text-text-primary sm:text-[18px]">{step.title}</h3>
              <p className="mt-2 font-body text-[15px] leading-[1.7] text-text-muted sm:text-[16px]"><RichText content={step.content} /></p>
              {step.widget === 'position-size' && <PlanWidget practice={practice} />}
              {step.widget === 'process-review' && <ReviewWidget practice={practice} />}
              {step.chips && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {step.chips.map((chip) => (
                    <li key={chip} className="rounded-full border border-input bg-panel px-2.5 py-[5px] font-body text-[11px] font-semibold text-text-muted">{chip}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
