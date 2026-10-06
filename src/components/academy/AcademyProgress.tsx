import { academyModules } from '../../data/academy'

type Props = {
  completed: Set<string>
}

export function AcademyProgress({ completed }: Props) {
  return (
    <ol aria-label="Progreso por módulos" className="grid grid-cols-5 gap-1">
      {academyModules.map((module, index) => {
        const done = module.lessons.filter((lesson) => completed.has(lesson.id)).length
        const unlocked = index === 0 || academyModules[index - 1].lessons.every((lesson) => completed.has(lesson.id))
        const active = unlocked && done < module.lessons.length

        return (
          <li key={module.id} className="min-w-0">
            <div className="mb-2 flex items-center" aria-hidden="true">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${done === module.lessons.length ? 'bg-gain' : active ? 'bg-signal' : 'bg-hairline'}`} />
              {index < academyModules.length - 1 && <span className={`h-px flex-1 ${done === module.lessons.length ? 'bg-gain/60' : 'bg-hairline'}`} />}
            </div>
            <p className={`font-mono text-[10px] tabular-nums ${active ? 'text-signal' : 'text-text-faint'}`}>
              {module.number}
            </p>
            <p className="mt-1 truncate font-body text-[11px] text-text-muted">{module.title}</p>
          </li>
        )
      })}
    </ol>
  )
}
