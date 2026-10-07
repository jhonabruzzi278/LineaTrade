export type LessonStatus = 'done' | 'current' | 'pending'

/** Texto para lectores de pantalla equivalente al estado visual. */
export function lessonStatusLabel(status: LessonStatus): string {
  return status === 'done' ? 'Completada' : status === 'current' ? 'Siguiente lección' : 'Pendiente'
}

/** Estado de una lección según el progreso y la lección recomendada. */
export function getLessonStatus(lessonId: string, completed: ReadonlySet<string>, currentLessonId: string | null): LessonStatus {
  if (completed.has(lessonId)) return 'done'
  return lessonId === currentLessonId ? 'current' : 'pending'
}
