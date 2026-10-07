import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Tag } from '@/components/ui/tag'
import { cn } from '@/lib/utils'
import type { AcademyModule } from '../../data/academy'
import { formatAcademyDuration } from '../../data/academy'
import { getLessonStatus, lessonStatusLabel } from './lessonStatus'
import { LessonStatusDot } from './LessonStatusDot'

interface Props {
  module: AcademyModule
  completed: ReadonlySet<string>
  /** Lección recomendada a continuación (se resalta dentro de su módulo). */
  currentLessonId: string
  open: boolean
  onToggle: () => void
}

// Fila de módulo del aula. Todas las lecciones están abiertas: el orden es una
// recomendación, así que nunca hay candados ni lecciones deshabilitadas.
export function AcademyModuleRow({ module, completed, currentLessonId, open, onToggle }: Props) {
  const doneCount = module.lessons.filter((lesson) => completed.has(lesson.id)).length
  const isComplete = doneCount === module.lessons.length
  const panelId = `modulo-${module.id}`

  return (
    <article
      className={cn(
        'rounded-xl border bg-panel',
        module.isNew && !open ? 'border-spark/40 bg-gradient-to-b from-spark/[0.07] to-panel' : open ? 'border-signal/40' : 'border-hairline',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[72px] w-full items-center gap-4 rounded-xl px-4 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-6"
      >
        <span className={cn('num text-[22px] sm:text-[26px]', isComplete ? 'text-steel' : 'text-text-primary')}>{module.number}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="font-body text-[15px] font-bold text-text-primary sm:text-[17px]">{module.title}</span>
            {module.isNew && <Tag tone="solid-spark">Nuevo</Tag>}
          </span>
          <span className="num mt-1 block text-[11px] text-text-faint sm:text-[12px]">
            {doneCount}/{module.lessons.length} lecciones · {formatAcademyDuration(module.durationMinutes)}
          </span>
          {module.isNew && !open && (
            <span className="mt-1.5 block font-body text-[12px] leading-snug text-text-muted sm:text-[13px]">{module.description}</span>
          )}
        </span>
        {isComplete && <Tag tone="brand">Completo</Tag>}
        <ChevronDown className={cn('h-[18px] w-[18px] shrink-0 text-text-faint transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <ol id={panelId} className="px-4 pb-2 sm:ml-11 sm:pl-0 sm:pr-6">
          {module.lessons.map((lesson) => {
            const status = getLessonStatus(lesson.id, completed, currentLessonId)
            return (
              <li key={lesson.id} className="border-t border-hairline">
                <Link
                  to={`/academia/lecciones/${lesson.id}`}
                  aria-current={status === 'current' ? 'step' : undefined}
                  className="flex min-h-[50px] items-center gap-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:gap-3.5"
                >
                  <LessonStatusDot status={status} />
                  <span className={cn('min-w-0 flex-1 font-body text-[14px] sm:text-[15px]', status === 'current' ? 'font-bold text-text-primary' : 'text-text-muted')}>
                    <span className="sr-only">{lessonStatusLabel(status)}: </span>
                    {lesson.title}
                    {lesson.practice && <Tag tone="spark" className="ml-2 align-middle">Práctica</Tag>}
                    {lesson.isNew && <Tag tone="solid-spark" className="ml-1.5 align-middle">Nuevo</Tag>}
                  </span>
                  <span className="num shrink-0 text-[11px] text-text-faint sm:text-[12px]">{lesson.durationMinutes} min</span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}
