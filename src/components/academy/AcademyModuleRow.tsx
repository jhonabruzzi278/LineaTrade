import { Check, ChevronDown, LockKeyhole, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AcademyModule } from '../../data/academy'
import { formatAcademyDuration } from '../../data/academy'

type Props = {
  module: AcademyModule
  unlocked: boolean
  completed: Set<string>
  open: boolean
  onToggle: () => void
}

export function AcademyModuleRow({ module, unlocked, completed, open, onToggle }: Props) {
  const completedCount = module.lessons.filter((lesson) => completed.has(lesson.id)).length
  const complete = completedCount === module.lessons.length

  return (
    <article className="border-t border-hairline last:border-b">
      <button
        type="button"
        onClick={onToggle}
        disabled={!unlocked}
        aria-expanded={open}
        className="group grid min-h-24 w-full grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-4 py-5 text-left disabled:cursor-not-allowed"
      >
        <span className={`font-mono text-[22px] tabular-nums ${unlocked ? 'text-text-primary' : 'text-text-faint'}`}>
          {module.number}
        </span>
        <span className="min-w-0">
          <span className={`block font-display text-[17px] font-medium ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>
            {module.title}
          </span>
          <span className="mt-1 block font-body text-[12px] leading-relaxed text-text-faint">
            {unlocked
              ? `${completedCount}/${module.lessons.length} lecciones · ${formatAcademyDuration(module.durationMinutes)}`
              : 'Se abre al completar el módulo anterior'}
          </span>
        </span>
        <span className="flex h-11 w-11 items-center justify-center text-text-faint">
          {!unlocked ? <LockKeyhole className="h-4 w-4" /> : complete ? <Check className="h-4 w-4 text-gain" /> : <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />}
        </span>
      </button>

      {open && unlocked && (
        <ol className="pb-5 pl-16">
          {module.lessons.map((lesson, index) => {
            const lessonComplete = completed.has(lesson.id)
            const lessonUnlocked = index === 0 || completed.has(module.lessons[index - 1].id)
            return (
              <li key={lesson.id} className="border-t border-hairline/70 first:border-t-0">
                {lessonUnlocked ? (
                  <Link
                    to={`/academia/lecciones/${lesson.id}`}
                    className="group flex min-h-14 items-center gap-3 py-3 pr-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${lessonComplete ? 'border-gain/40 bg-gain/10 text-gain' : 'border-hairline text-text-faint group-hover:border-signal/50 group-hover:text-signal'}`}>
                      {lessonComplete ? <Check className="h-3.5 w-3.5" /> : <Play className="h-3 w-3 translate-x-px" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-body text-[13px] text-text-primary">{lesson.title}</span>
                      {lesson.practice && <span className="mt-0.5 block font-mono text-[10px] text-signal">Práctica · {lesson.practice}</span>}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-text-faint">{lesson.durationMinutes} min</span>
                  </Link>
                ) : (
                  <div className="flex min-h-14 items-center gap-3 py-3 pr-2 opacity-45">
                    <span className="flex h-6 w-6 items-center justify-center"><LockKeyhole className="h-3.5 w-3.5 text-text-faint" /></span>
                    <span className="flex-1 font-body text-[13px] text-text-muted">{lesson.title}</span>
                    <span className="font-mono text-[10px] text-text-faint">{lesson.durationMinutes} min</span>
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </article>
  )
}
