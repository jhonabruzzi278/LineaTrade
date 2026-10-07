import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/ui/progress-bar'
import { cn } from '@/lib/utils'
import type { AcademyModule } from '../../data/academy'
import type { LessonStep } from '../../data/lessonTypes'
import { getLessonStatus } from './lessonStatus'
import { LessonStatusDot } from './LessonStatusDot'

const PANEL = 'rounded-xl border border-hairline bg-panel p-5'

// «En este módulo»: progreso y lista de lecciones. Todas son enlaces; la actual
// se marca con aria-current. Solo escritorio (la lección móvil lleva barra superior).
export function ModulePanel({ module, currentLessonId, completed }: { module: AcademyModule; currentLessonId: string; completed: ReadonlySet<string> }) {
  const doneCount = module.lessons.filter((lesson) => completed.has(lesson.id)).length
  return (
    <aside aria-labelledby="module-panel-title" className={PANEL}>
      <h2 id="module-panel-title" className="label-mono">En este módulo</h2>
      <ProgressBar value={(doneCount / module.lessons.length) * 100} label={`Progreso del módulo ${module.title}`} className="mt-3" />
      <p className="num mt-2 mb-2 text-[11px] text-text-faint">{doneCount} de {module.lessons.length} lecciones</p>
      <ol>
        {module.lessons.map((lesson, index) => {
          const isCurrent = lesson.id === currentLessonId
          const status = isCurrent && !completed.has(lesson.id) ? 'current' : getLessonStatus(lesson.id, completed, null)
          return (
            <li key={lesson.id} className={cn('border-t border-hairline', index === module.lessons.length - 1 && 'border-b')}>
              <Link
                to={`/academia/lecciones/${lesson.id}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'flex min-h-11 items-center gap-3 py-1.5 font-body text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isCurrent ? 'font-bold text-text-primary' : 'text-text-muted hover:text-text-primary',
                )}
              >
                <LessonStatusDot status={status} />
                {lesson.title}
              </Link>
            </li>
          )
        })}
      </ol>
      <Link to="/academia/glosario" className="mt-3.5 inline-block font-body text-[13px] font-bold text-steel hover:underline">Ver el Glosario →</Link>
    </aside>
  )
}

// «Tu práctica»: avance de los pasos de la lección (amarillo = práctica).
export function PracticePanel({ steps, doneSteps, className }: { steps: readonly LessonStep[]; doneSteps: readonly string[]; className?: string }) {
  const doneCount = steps.filter((step) => doneSteps.includes(step.id)).length
  const currentId = steps.find((step) => !doneSteps.includes(step.id))?.id
  return (
    <aside aria-labelledby="practice-panel-title" className={cn(PANEL, className)}>
      <div className="flex items-baseline justify-between">
        <h2 id="practice-panel-title" className="label-mono">Tu práctica</h2>
        <span className="num text-[11px] text-text-faint">{doneCount} de {steps.length}</span>
      </div>
      <ProgressBar tone="spark" value={(doneCount / steps.length) * 100} label="Avance de tu práctica" className="mt-3 mb-1.5" />
      <ol>
        {steps.map((step, index) => {
          const done = doneSteps.includes(step.id)
          return (
            <li key={step.id} className={cn('flex min-h-11 items-center gap-3 border-t border-hairline font-body text-[14px]', index === 0 && 'border-t-0', step.id === currentId ? 'font-semibold text-text-primary' : 'text-text-muted')}>
              <LessonStatusDot status={done ? 'done' : step.id === currentId ? 'current' : 'pending'} />
              <a href={`#paso-${step.id}`} className="py-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="sr-only">{done ? 'Hecho: ' : 'Pendiente: '}</span>
                {step.practiceLabel}
              </a>
            </li>
          )
        })}
      </ol>
    </aside>
  )
}
