import { useState } from 'react'
import { ArrowRight, BookOpen, Clock3, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AcademyModuleRow } from '../components/academy/AcademyModuleRow'
import { AcademyProgress } from '../components/academy/AcademyProgress'
import { academyModules, academyTotalMinutes, formatAcademyDuration } from '../data/academy'
import { useAcademyProgress } from '../hooks/useAcademyProgress'
import { useAuth } from '../lib/auth'
import { cn } from '@/lib/utils'

export default function Academia() {
  const { user } = useAuth()
  const { completed, completedCount, nextLesson, totalCount, loading, syncError } = useAcademyProgress(user?.id)
  const [openModuleId, setOpenModuleId] = useState<string | null>(nextLesson.moduleId)
  const progress = Math.round((completedCount / totalCount) * 100)

  return (
    <div className="min-h-screen bg-ink">
      <main className={cn('mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-6 lg:pb-12 lg:pt-10')}>
        <header className="mb-10 max-w-3xl reveal-up">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-signal">Tu aula</p>
          <h1 className="text-balance font-display text-[30px] font-medium tracking-[-0.03em] text-text-primary sm:text-[36px]">
            Aprende una idea. Pruébala. Registra evidencia.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty font-body text-[14px] leading-6 text-text-muted">
            Empieza por el módulo 1. El progreso se desbloquea cuando completas la lección y su práctica.
          </p>
        </header>

        <section aria-labelledby="continue-title" className="mb-12 grid gap-7 border-y border-hairline py-7 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">Continúa aquí</p>
            <h2 id="continue-title" className="mt-3 font-display text-[22px] font-medium text-text-primary">{nextLesson.title}</h2>
            <p className="mt-2 font-body text-[13px] text-text-muted">{nextLesson.moduleTitle}</p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[10px] text-text-faint">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> {nextLesson.durationMinutes} min</span>
              <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> {nextLesson.practice ?? 'Concepto base'}</span>
            </div>
          </div>
          <Link to={`/academia/lecciones/${nextLesson.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-sm bg-signal px-5 py-3 font-body text-[13px] font-semibold text-on-signal transition-[background-color,transform] duration-150 hover:bg-signal-dim active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink">
            {completedCount ? 'Continuar lección' : 'Comenzar'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        <section aria-labelledby="progress-title" className="mb-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] tabular-nums text-signal">{completedCount} de {totalCount} lecciones</p>
              <h2 id="progress-title" className="mt-1 font-display text-[18px] font-medium text-text-primary">Tu recorrido</h2>
            </div>
            <div className="text-right">
              <p className="font-mono text-[20px] tabular-nums text-text-primary">{progress}%</p>
              <p className="font-body text-[11px] text-text-faint">5 módulos · {formatAcademyDuration(academyTotalMinutes)}</p>
            </div>
          </div>
          <div className="mb-5 h-1 overflow-hidden rounded-full bg-hairline" aria-hidden="true">
            <div className="h-full rounded-full bg-signal transition-transform duration-300 origin-left" style={{ transform: `scaleX(${progress / 100})` }} />
          </div>
          <AcademyProgress completed={completed} />
          <p role={syncError ? 'status' : undefined} className="mt-4 font-body text-[11px] text-text-faint">
            {loading ? 'Sincronizando progreso…' : syncError ? 'Progreso guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.' : user ? 'Progreso sincronizado con tu cuenta.' : 'Progreso guardado en este dispositivo.'}
          </p>
        </section>

        <section aria-labelledby="modules-title">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-signal" />
            <h2 id="modules-title" className="font-display text-[18px] font-medium text-text-primary">Formación</h2>
          </div>
          <div>
            {academyModules.map((module, index) => {
              const unlocked = index === 0 || academyModules[index - 1].lessons.every((lesson) => completed.has(lesson.id))
              return (
                <AcademyModuleRow
                  key={module.id}
                  module={module}
                  unlocked={unlocked}
                  completed={completed}
                  open={openModuleId === module.id}
                  onToggle={() => setOpenModuleId((current) => current === module.id ? null : module.id)}
                />
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
