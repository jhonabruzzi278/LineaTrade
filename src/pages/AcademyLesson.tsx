import { ArrowLeft, Check, Clock3, FlaskConical } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { academyLessons } from '../data/academy'
import { useAcademyProgress } from '../hooks/useAcademyProgress'
import { useAuth } from '../lib/auth'

export default function AcademyLesson() {
  const { lessonId } = useParams()
  const lesson = academyLessons.find((item) => item.id === lessonId)
  const { user } = useAuth()
  const { completed, savingLessonId, syncError, setLessonCompleted } = useAcademyProgress(user?.id)

  if (!lesson) return <Navigate to="/academia" replace />
  const isComplete = completed.has(lesson.id)

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-6 sm:py-12">
        <Link to="/academia" className="inline-flex min-h-11 items-center gap-2 font-body text-[13px] text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
          <ArrowLeft className="h-4 w-4" /> Volver al aula
        </Link>

        <header className="mt-8 border-b border-hairline pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">{lesson.moduleTitle}</p>
          <h1 className="mt-3 text-balance font-display text-[30px] font-medium tracking-[-0.03em] text-text-primary sm:text-[38px]">{lesson.title}</h1>
          <p className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] text-text-faint"><Clock3 className="h-3.5 w-3.5" /> {lesson.durationMinutes} min</p>
        </header>

        <article className="py-9 font-body text-[15px] leading-7 text-text-muted">
          <p className="text-pretty">Esta lección introduce el concepto dentro del proceso LineaTrade: comprenderlo, observarlo en contexto y convertirlo en evidencia antes de incorporarlo a una estrategia.</p>
          <h2 className="mt-8 font-display text-[19px] font-medium text-text-primary">Objetivo</h2>
          <p className="mt-3 text-pretty">Al terminar podrás explicar el concepto con tus palabras y reconocer cuándo aplica y cuándo no. LineaTrade no lo convierte en una señal de entrada.</p>

          {lesson.practice && (
            <section className="mt-9 border-l-2 border-signal bg-panel px-5 py-5">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-signal"><FlaskConical className="h-4 w-4" /> Práctica</p>
              <p className="mt-3 text-text-primary">{lesson.practice}</p>
              <p className="mt-1 text-[13px] text-text-faint">La evidencia práctica se conectará con tu journal en la siguiente fase.</p>
            </section>
          )}
        </article>

        <footer className="flex flex-col gap-3 border-t border-hairline pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p role={syncError ? 'status' : undefined} className="font-body text-[12px] text-text-faint">
            {syncError ? 'Guardado localmente; pendiente de sincronizar.' : user ? 'Tu progreso se guarda en tu cuenta.' : 'Tu progreso queda guardado en este dispositivo.'}
          </p>
          <button type="button" disabled={savingLessonId === lesson.id} onClick={() => void setLessonCompleted(lesson.id, !isComplete)} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-sm px-5 py-3 font-body text-[13px] font-semibold transition-[background-color,transform,opacity] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-ink disabled:cursor-wait disabled:opacity-60 ${isComplete ? 'bg-gain/10 text-gain ring-1 ring-inset ring-gain/30 hover:bg-gain/15' : 'bg-signal text-ink hover:bg-signal-dim'}`}>
            <Check className="h-4 w-4" /> {savingLessonId === lesson.id ? 'Guardando…' : isComplete ? 'Lección completada' : 'Marcar como completada'}
          </button>
        </footer>
      </main>
    </div>
  )
}
