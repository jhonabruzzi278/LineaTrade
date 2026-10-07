import { Check, ChevronDown, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AcademyModule } from '../../data/academy'
import { formatAcademyDuration } from '../../data/academy'
import { Tag } from '../ui/tag'

type Props = {
  module: AcademyModule
  recommended: boolean
  completed: Set<string>
  open: boolean
  onToggle: () => void
}

export function AcademyModuleRow({ module, recommended, completed, open, onToggle }: Props) {
  const completedCount = module.lessons.filter((lesson) => completed.has(lesson.id)).length
  const complete = completedCount === module.lessons.length

  return (
    <article className="border-t border-hairline last:border-b">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="group grid min-h-20 w-full grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <span className="font-mono text-[20px] tabular-nums text-text-primary">{module.number}</span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 font-display text-[17px] font-medium text-text-primary">
            {module.title}
            {recommended && <Tag tone="brand" className="font-body normal-case tracking-normal">Orden sugerido</Tag>}
          </span>
          <span className="mt-1 block font-body text-[12px] leading-relaxed text-text-faint">
            {completedCount}/{module.lessons.length} lecciones · {formatAcademyDuration(module.durationMinutes)}
          </span>
        </span>
        <span className="flex h-11 w-11 items-center justify-center text-text-faint">
          {complete ? <Check className="h-4 w-4 text-steel" /> : <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
        </span>
      </button>

      {open && (
        <ol className="pb-5 pl-12">
          {module.lessons.map((lesson) => {
            const lessonComplete = completed.has(lesson.id)
            return (
              <li key={lesson.id} className="border-t border-hairline/70 first:border-t-0">
                <Link
                  to={`/academia/lecciones/${lesson.id}`}
                  className="group flex min-h-14 items-center gap-3 py-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${lessonComplete ? 'border-steel/40 bg-steel/10 text-steel' : 'border-hairline text-text-faint group-hover:border-signal/50 group-hover:text-signal'}`}>
                    {lessonComplete ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3 translate-x-px" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-body text-[13px] text-text-primary">{lesson.title}</span>
                    {lesson.practice && <span className="mt-0.5 block font-mono text-[10px] text-steel">Práctica · {lesson.practice}</span>}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-text-faint">{lesson.durationMinutes} min</span>
                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}
