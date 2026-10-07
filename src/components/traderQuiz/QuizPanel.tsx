import { ChevronLeft } from 'lucide-react'
import { traderQuizBlocks, traderQuizQuestions } from '../../data/traderQuiz'
import { useWizard } from '../../hooks/useWizard'
import { Button } from '../ui/button'
import { ProgressBar } from '../ui/progress-bar'
import { QuizBlocksAside } from './QuizBlocksAside'
import { QuizStep } from './QuizStep'

const QUESTION_IDS = traderQuizQuestions.map((q) => q.id)

interface QuizPanelProps {
  /** Se llama con todas las respuestas al terminar la última pregunta. */
  onFinish: (answers: Record<string, string>) => void
  saving: boolean
  error: string | null
}

// Cuestionario por bloques. Es un componente propio (y no parte de la página) para
// que «Repetir el cuestionario» pueda remontarlo con una `key` nueva y empezar de cero.
export function QuizPanel({ onFinish, saving, error }: QuizPanelProps) {
  const wizard = useWizard(QUESTION_IDS)
  const question = traderQuizQuestions[wizard.stepIndex]
  const blockIndex = Math.max(
    0,
    traderQuizBlocks.findIndex((b) => b.id === question.blockId),
  )
  const block = traderQuizBlocks[blockIndex]
  const blockProgress = ((blockIndex + 1) / traderQuizBlocks.length) * 100
  const isAnswered = Boolean(wizard.answers[question.id])

  function handleNext() {
    if (wizard.isLastStep) {
      onFinish(wizard.answers)
      return
    }
    wizard.goNext()
  }

  return (
    <div className="lg:grid lg:max-w-[960px] lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start lg:gap-7">
      <QuizBlocksAside
        blocks={traderQuizBlocks}
        currentBlockIndex={blockIndex}
        questionNumber={wizard.stepIndex + 1}
        questionTotal={QUESTION_IDS.length}
        progressPercent={wizard.progressPercent}
      />

      <section aria-label="Pregunta" className="lg:rounded-xl lg:border lg:border-hairline lg:bg-panel lg:px-7 lg:py-6">
        <div className="lg:hidden">
          <p className="label-mono !text-steel">
            IA Trader · bloque {blockIndex + 1} de {traderQuizBlocks.length}
          </p>
          <ProgressBar value={blockProgress} label="Avance por bloques" className="mt-2.5" />
        </div>
        <p className="label-mono hidden !text-steel lg:block">
          Bloque {blockIndex + 1} de {traderQuizBlocks.length} · {block.title}
        </p>
        <p className="num mt-4 text-[11px] text-text-faint lg:hidden">
          {block.title} · pregunta {wizard.stepIndex + 1} de {QUESTION_IDS.length}
        </p>

        <h2 className="font-display mt-2 text-[22px] leading-tight text-text-primary lg:mt-2.5 lg:text-[24px]">{question.title}</h2>

        <div className="mt-5">
          <QuizStep question={question} selectedValue={wizard.answers[question.id]} onSelect={(value) => wizard.setAnswer(question.id, value)} />
        </div>

        {error && (
          <p role="alert" className="mt-4 font-body text-[13px] text-loss">
            {error}
          </p>
        )}
        <p className="mt-4 font-body text-[12px] leading-relaxed text-text-faint">
          Se calcula con reglas, no con un modelo de lenguaje: las mismas respuestas dan siempre el mismo plan.
        </p>

        <div className="mt-6 flex items-center gap-2.5 border-t border-hairline pt-5">
          {!wizard.isFirstStep && (
            <Button variant="outline" size="lg" onClick={wizard.goBack}>
              <ChevronLeft size={16} aria-hidden="true" />
              Atrás
            </Button>
          )}
          <Button variant="cta" size="lg" onClick={handleNext} disabled={!isAnswered || saving} className="flex-1 lg:ml-auto lg:flex-none">
            {saving ? 'Calculando...' : wizard.isLastStep ? 'Ver mi plan' : 'Siguiente'}
          </Button>
        </div>
      </section>
    </div>
  )
}
