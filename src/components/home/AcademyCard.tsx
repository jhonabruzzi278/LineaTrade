import { Link } from 'react-router-dom'
import { Card } from '../ui/card'
import { ProgressBar } from '../ui/progress-bar'
import { academyModules } from '../../data/academy'
import { useAcademyProgress } from '../../hooks/useAcademyProgress'

// Avance real de la Academia: lecciones completadas sobre el total y la siguiente
// lección pendiente. Los datos vienen de useAcademyProgress (Supabase + respaldo local).
export function AcademyCard({ userId }: { userId: string }) {
  const { completedCount, totalCount, nextLesson } = useAcademyProgress(userId)
  const moduleIndex = academyModules.findIndex((module) => module.lessons.some((lesson) => lesson.id === nextLesson.id))
  const allDone = completedCount >= totalCount
  const percent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <Card as="section" className="px-4 py-3.5 sm:p-4">
      <p className="label-mono">
        Academia · módulo {moduleIndex + 1} de {academyModules.length}
      </p>
      <p className="mt-1.5 font-body text-[14px] font-semibold text-text-primary">
        {allDone ? 'Completaste todas las lecciones' : nextLesson.title}
      </p>
      <ProgressBar
        value={percent}
        label={`Avance de la Academia: ${completedCount} de ${totalCount} lecciones`}
        className="mt-3 h-[5px]"
      />
      <Link
        to={allDone ? '/academia' : `/academia/lecciones/${nextLesson.id}`}
        className="mt-2.5 inline-flex min-h-11 items-center font-body text-[13px] font-semibold text-steel"
      >
        {allDone ? 'Repasar la Academia →' : completedCount > 0 ? 'Continuar lección →' : 'Empezar lección →'}
      </Link>
    </Card>
  )
}
