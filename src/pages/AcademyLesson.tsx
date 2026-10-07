import { useEffect } from 'react'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { LessonBody, PracticeBlock } from '../components/academy/LessonBody'
import { ModulePanel, PracticePanel } from '../components/academy/LessonSidePanel'
import { RichText } from '../components/academy/RichText'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Tag } from '@/components/ui/tag'
import { academyLessons, academyModules, getNextAcademyLesson, type AcademyLessonRef } from '../data/academy'
import { lessonContent } from '../data/lessonContent'
import type { LessonContent, LessonStep } from '../data/lessonTypes'
import { useAcademyProgress } from '../hooks/useAcademyProgress'
import { useLessonPractice } from '../hooks/useLessonPractice'
import { useAuth } from '../lib/auth'

function getSteps(content: LessonContent | undefined): readonly LessonStep[] {
  const block = content?.blocks.find((item) => item.type === 'steps')
  return block?.type === 'steps' ? block.steps : []
}

interface CompleteButtonProps {
  isComplete: boolean
  saving: boolean
  onToggle: () => void
  className?: string
}

function CompleteButton({ isComplete, saving, onToggle, className }: CompleteButtonProps) {
  return (
    <Button
      type="button"
      variant={isComplete ? 'outline' : 'cta'}
      size="lg"
      aria-pressed={isComplete}
      disabled={saving}
      onClick={onToggle}
      className={className}
    >
      <Check className="h-[17px] w-[17px]" strokeWidth={2.6} aria-hidden="true" />
      {saving ? 'Guardando…' : isComplete ? 'Lección completada' : 'Marcar como completada'}
    </Button>
  )
}

// Contenido que existía antes del rediseño, para las lecciones aún sin redactar.
function PlaceholderBody({ lesson }: { lesson: AcademyLessonRef }) {
  return (
    <>
      <p className="mt-6 text-pretty font-body text-[16px] leading-[1.7] text-text-muted lg:text-[17px] lg:leading-[1.75]">
        Esta lección introduce el concepto dentro del proceso LineaTrade: comprenderlo, observarlo en contexto y convertirlo en evidencia antes de incorporarlo a una estrategia.
      </p>
      <h2 className="font-display mt-8 text-[20px] text-text-primary lg:text-[22px]">Objetivo</h2>
      <p className="mt-2.5 text-pretty font-body text-[16px] leading-[1.7] text-text-muted lg:text-[17px] lg:leading-[1.75]">
        Al terminar podrás explicar el concepto con tus palabras y reconocer cuándo aplica y cuándo no. LineaTrade no lo convierte en una señal de entrada.
      </p>
      <Card tone="dashed" className="mt-7 text-center font-body text-[14px] leading-relaxed text-text-faint">
        <p className="font-bold text-text-muted">Contenido en preparación</p>
        <p className="mt-1">El texto, los ejemplos y los gráficos de esta lección todavía no están publicados.</p>
      </Card>
      {lesson.practice && (
        <PracticeBlock title={lesson.practice} description="La evidencia práctica se conectará con tu journal en la siguiente fase." />
      )}
    </>
  )
}

function LessonView({ lesson }: { lesson: AcademyLessonRef }) {
  const { user } = useAuth()
  const { completed, savingLessonId, syncError, setLessonCompleted } = useAcademyProgress(user?.id)
  const practice = useLessonPractice(user?.id, lesson.id)
  const content = lessonContent[lesson.id]
  const steps = getSteps(content)
  const module = academyModules.find((item) => item.id === lesson.moduleId) ?? academyModules[0]
  const next = getNextAcademyLesson(lesson.id)
  const isComplete = completed.has(lesson.id)
  const saving = savingLessonId === lesson.id
  const position = lesson.indexInModule + 1
  const syncText = syncError
    ? 'Guardado localmente; pendiente de sincronizar.'
    : user ? 'Tu progreso se guarda en tu cuenta.' : 'Tu progreso queda guardado en este dispositivo.'
  const toggleComplete = () => void setLessonCompleted(lesson.id, !isComplete)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [lesson.id])

  return (
    <main className="mx-auto max-w-6xl px-5 pt-3 pb-48 lg:pt-6 lg:pb-12">
      <div className="flex items-center justify-between lg:justify-start">
        <Link to="/academia" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-body text-[14px] font-semibold text-text-faint hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-[13px]">
          <ChevronLeft className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden="true" /> Academia
        </Link>
        <span className="num text-[11px] text-text-faint lg:hidden">{position} de {lesson.moduleLessonCount}</span>
      </div>
      <ProgressBar className="h-1 lg:hidden" value={(position / lesson.moduleLessonCount) * 100} label={`Lección ${position} de ${lesson.moduleLessonCount} del módulo`} />

      <div className="mt-5 lg:mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12">
        <article className="min-w-0 lg:max-w-[760px]">
          <p className="label-mono text-steel">
            Módulo {Number(lesson.moduleNumber)} · {lesson.moduleTitle}
          </p>
          <h1 className="font-display mt-3 text-[30px] leading-[1.08] text-text-primary lg:text-[38px]">{lesson.title}</h1>
          <p className="num mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-text-faint lg:mt-3.5">
            <span className="hidden lg:inline">Lección {position} de {lesson.moduleLessonCount}</span>
            <span>{lesson.durationMinutes} min</span>
            {lesson.practice && <Tag tone="spark">Incluye práctica</Tag>}
          </p>

          {content && (
            <section aria-labelledby="objetivo-leccion" className="mt-6 rounded-xl border border-hairline bg-panel px-4 py-3.5 lg:px-[22px] lg:py-[18px]">
              <h2 id="objetivo-leccion" className="label-mono">Lo que vas a poder hacer</h2>
              <p className="mt-1.5 font-body text-[15px] leading-[1.55] text-text-primary lg:text-[16px] lg:leading-[1.6]"><RichText content={content.objective} /></p>
            </section>
          )}

          {content ? <LessonBody blocks={content.blocks} practice={practice} /> : <PlaceholderBody lesson={lesson} />}

          {steps.length > 0 && <PracticePanel className="mt-5 lg:hidden" steps={steps} doneSteps={practice.state.doneSteps} />}

          <div className="mt-8 hidden flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5 lg:flex">
            <span role={syncError ? 'status' : undefined} className="font-body text-[13px] text-text-faint">{syncText}</span>
            <CompleteButton isComplete={isComplete} saving={saving} onToggle={toggleComplete} />
          </div>

          {next && (
            <Link
              to={`/academia/lecciones/${next.id}`}
              className="mt-4 flex min-h-[60px] items-center justify-between gap-3 rounded-xl border border-input px-[18px] py-2 transition-colors hover:border-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-5"
            >
              <span>
                <span className="label-mono block">{next.moduleId === lesson.moduleId ? 'Siguiente' : `Siguiente · Módulo ${Number(next.moduleNumber)}`}</span>
                <span className="mt-0.5 block font-body text-[15px] font-bold text-text-primary">{next.title}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-steel" aria-hidden="true" />
            </Link>
          )}
        </article>

        <div className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
          <ModulePanel module={module} currentLessonId={lesson.id} completed={completed} />
          {steps.length > 0 && <PracticePanel steps={steps} doneSteps={practice.state.doneSteps} />}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-ink px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <CompleteButton isComplete={isComplete} saving={saving} onToggle={toggleComplete} className="w-full" />
        <p role={syncError ? 'status' : undefined} className="mt-2 text-center font-body text-[11px] text-text-faint">{syncText}</p>
      </div>
    </main>
  )
}

export default function AcademyLesson() {
  const { lessonId } = useParams()
  const lesson = academyLessons.find((item) => item.id === lessonId)
  if (!lesson) return <Navigate to="/academia" replace />
  return <LessonView key={lesson.id} lesson={lesson} />
}
