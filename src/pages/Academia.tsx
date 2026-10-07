import { useState } from 'react'
import { ArrowRight, BookOpen, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AcademyModuleRow } from '../components/academy/AcademyModuleRow'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { academyModules, academyTotalMinutes, formatAcademyDuration } from '../data/academy'
import { useAcademyProgress } from '../hooks/useAcademyProgress'
import { useAuth } from '../lib/auth'

function syncMessage(loading: boolean, syncError: boolean, signedIn: boolean): string {
  if (loading) return 'Sincronizando progreso…'
  if (syncError) return 'Progreso guardado en este dispositivo. Se sincronizará cuando vuelva la conexión.'
  return signedIn ? 'Tu progreso se guarda en tu cuenta.' : 'Progreso guardado en este dispositivo.'
}

export default function Academia() {
  const { user } = useAuth()
  const { completed, completedCount, nextLesson, totalCount, loading, syncError } = useAcademyProgress(user?.id)
  const [openModuleId, setOpenModuleId] = useState<string | null>(nextLesson.moduleId)
  const progress = Math.round((completedCount / totalCount) * 100)
  const allDone = completedCount === totalCount
  const hasStarted = completedCount > 0

  const continueKicker = allDone ? 'Aula completada' : hasStarted ? 'Continúa donde lo dejaste' : 'Empieza aquí'
  const continueAction = allDone ? 'Repasar lección' : hasStarted ? 'Continuar lección' : 'Comenzar lección'

  return (
    <main className="mx-auto max-w-6xl px-5 pt-6 pb-28 lg:pb-12">
      <header className="mb-6 max-w-3xl">
        <p className="label-mono">tu aula</p>
        <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary sm:text-[32px]">
          <span className="lg:hidden">Academia</span>
          <span className="hidden lg:inline">Aprende una idea. Pruébala. Registra evidencia.</span>
        </h1>
        <p className="mt-2 hidden font-body text-[15px] leading-relaxed text-text-faint lg:block">
          Sigue el orden recomendado o salta a lo que necesites: todas las lecciones están abiertas.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card tone="brand" as="section" aria-labelledby="continue-title" className="flex flex-col justify-between gap-5 p-[18px] lg:p-[26px]">
          <div>
            <p className="label-mono text-on-signal/80!">{continueKicker}</p>
            <h2 id="continue-title" className="font-display mt-2 text-[22px] leading-[1.1] lg:text-[26px]">{nextLesson.title}</h2>
            <p className="mt-1.5 font-body text-[13px] text-on-signal/90 lg:text-[14px]">
              Módulo {Number(nextLesson.moduleNumber)} · {nextLesson.moduleTitle}
            </p>
            <p className="num mt-2.5 text-[11px] text-on-signal/80 lg:text-[12px]">
              {nextLesson.durationMinutes} min{nextLesson.practice ? ' · Incluye práctica' : ''}
            </p>
          </div>
          <Link
            to={`/academia/lecciones/${nextLesson.id}`}
            className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-[10px] border-2 border-ink bg-spark px-6 font-body text-[15px] font-extrabold text-on-spark transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-signal lg:self-start"
          >
            {continueAction}
            <ArrowRight className="h-[17px] w-[17px]" strokeWidth={2.6} aria-hidden="true" />
          </Link>
        </Card>

        <Card as="section" aria-labelledby="progress-title" className="flex items-center gap-4 lg:flex-col lg:items-stretch lg:justify-between lg:gap-6 lg:p-6">
          <h2 id="progress-title" className="label-mono max-lg:sr-only">Tu recorrido</h2>
          <p className="font-display text-[32px] leading-none text-text-primary lg:text-[42px]">{progress}%</p>
          <div className="min-w-0 flex-1 lg:flex-none">
            <p className="num text-[11px] text-text-faint lg:mb-3 lg:text-[12px]">
              {completedCount} de {totalCount} lecciones · <span className="hidden lg:inline">{academyModules.length} módulos · </span>
              {formatAcademyDuration(academyTotalMinutes)}
            </p>
            <ProgressBar value={progress} label="Progreso de la Academia" className="mt-2 lg:mt-0" />
          </div>
        </Card>
      </div>

      <section aria-label="Herramientas de estudio" className="mt-4 grid gap-3 sm:grid-cols-2">
        <Link
          to="/academia/glosario"
          className="flex items-center gap-3.5 rounded-xl border border-hairline bg-panel px-[18px] py-4 transition-colors hover:border-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-panel-2 text-steel">
            <BookOpen className="h-[21px] w-[21px]" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-body text-[15px] font-bold text-text-primary">Glosario</span>
            <span className="mt-0.5 block font-body text-[13px] text-text-faint">Drawdown, R, expectativa y más</span>
          </span>
          <ChevronRight className="h-[18px] w-[18px] shrink-0 text-text-faint" aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="modules-title" className="mt-7">
        <h2 id="modules-title" className="font-display mb-3 text-[17px] text-text-primary lg:text-[18px]">Formación</h2>
        <div className="flex flex-col gap-3">
          {academyModules.map((module) => (
            <AcademyModuleRow
              key={module.id}
              module={module}
              completed={completed}
              currentLessonId={nextLesson.id}
              open={openModuleId === module.id}
              onToggle={() => setOpenModuleId((current) => (current === module.id ? null : module.id))}
            />
          ))}
        </div>
        <p role={syncError ? 'status' : undefined} className="num mt-5 text-[11px] text-text-faint">
          {syncMessage(loading, syncError, Boolean(user))}
        </p>
      </section>
    </main>
  )
}
