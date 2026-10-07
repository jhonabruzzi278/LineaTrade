import { Check } from 'lucide-react'
import type { QuizBlock } from '../../data/traderQuiz'
import { ProgressBar } from '../ui/progress-bar'
import { cn } from '@/lib/utils'

interface QuizBlocksAsideProps {
  blocks: QuizBlock[]
  /** Índice del bloque de la pregunta actual. */
  currentBlockIndex: number
  questionNumber: number
  questionTotal: number
  progressPercent: number
}

// Lista lateral de los 5 bloques del cuestionario (solo escritorio): hechos con
// check, el actual resaltado y el resto pendiente. El estado se lee también por
// texto (aria-current), no solo por color.
export function QuizBlocksAside({ blocks, currentBlockIndex, questionNumber, questionTotal, progressPercent }: QuizBlocksAsideProps) {
  return (
    <aside aria-label="Bloques del cuestionario" className="hidden rounded-xl border border-hairline bg-panel px-3.5 py-4 lg:block">
      <p className="label-mono px-1.5 pb-2">Tus {blocks.length} bloques</p>
      <ol>
        {blocks.map((block, index) => {
          const done = index < currentBlockIndex
          const current = index === currentBlockIndex
          return (
            <li
              key={block.id}
              aria-current={current ? 'step' : undefined}
              className={cn('flex min-h-11 items-center gap-3 px-1.5 font-body text-[14px]', current ? 'font-bold text-text-primary' : 'font-medium text-text-faint')}
            >
              <span
                className={cn(
                  'num flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 text-[11px]',
                  done && 'border-signal bg-signal text-on-signal',
                  current && 'border-signal bg-signal text-on-signal',
                  !done && !current && 'border-text-faint/50',
                )}
              >
                {done ? <Check size={14} strokeWidth={3.4} aria-hidden="true" /> : index + 1}
              </span>
              {block.title}
              {done && <span className="sr-only"> (completado)</span>}
            </li>
          )
        })}
      </ol>
      <p className="num px-1.5 pt-3 text-[11px] text-text-faint">
        Pregunta {questionNumber} de {questionTotal}
      </p>
      <ProgressBar value={progressPercent} label="Avance del cuestionario" className="mx-1.5 mt-2" />
    </aside>
  )
}
