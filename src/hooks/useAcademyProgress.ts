import { useEffect, useMemo, useState } from 'react'
import { academyLessons } from '../data/academy'
import { supabase } from '../lib/supabase'

const STORAGE_PREFIX = 'lineatrade:academy-progress:v2'
const LEGACY_STORAGE_KEY = 'lineatrade:academy-progress:v1'
const validLessonIds = new Set(academyLessons.map((lesson) => lesson.id))

function storageKey(userId?: string) {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}`
}

export function sanitizeAcademyLessonIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((id): id is string => typeof id === 'string' && validLessonIds.has(id))))
}

function readStoredLessons(userId?: string) {
  try {
    const current = localStorage.getItem(storageKey(userId))
    const guest = userId ? localStorage.getItem(storageKey()) : null
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY)
    return sanitizeAcademyLessonIds(JSON.parse(current ?? guest ?? legacy ?? '[]'))
  } catch {
    return []
  }
}

function writeStoredLessons(userId: string | undefined, lessonIds: string[]) {
  localStorage.setItem(storageKey(userId), JSON.stringify(lessonIds))
  localStorage.removeItem(LEGACY_STORAGE_KEY)
  if (userId) localStorage.removeItem(storageKey())
}

export function useAcademyProgress(userId?: string) {
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>(() => readStoredLessons(userId))
  const [loading, setLoading] = useState(Boolean(userId))
  const [syncError, setSyncError] = useState(false)
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const localLessonIds = readStoredLessons(userId)
    setCompletedLessonIds(localLessonIds)
    setSyncError(false)

    if (!userId) {
      setLoading(false)
      return () => { active = false }
    }

    const authenticatedUserId = userId
    setLoading(true)
    async function synchronize() {
      const { data, error } = await supabase
        .from('academy_lesson_progress')
        .select('lesson_id')
        .eq('user_id', authenticatedUserId)

      if (!active) return
      if (error) {
        setSyncError(true)
        setLoading(false)
        return
      }

      const remoteLessonIds = sanitizeAcademyLessonIds(data.map((row) => row.lesson_id))
      const mergedLessonIds = sanitizeAcademyLessonIds([...remoteLessonIds, ...localLessonIds])
      setCompletedLessonIds(mergedLessonIds)
      writeStoredLessons(authenticatedUserId, mergedLessonIds)

      const remoteSet = new Set(remoteLessonIds)
      const pendingRows = localLessonIds
        .filter((lessonId) => !remoteSet.has(lessonId))
        .map((lessonId) => ({ user_id: authenticatedUserId, lesson_id: lessonId, updated_at: new Date().toISOString() }))

      if (pendingRows.length > 0) {
        const { error: uploadError } = await supabase
          .from('academy_lesson_progress')
          .upsert(pendingRows, { onConflict: 'user_id,lesson_id' })
        if (active && uploadError) setSyncError(true)
      }
      if (active) setLoading(false)
    }

    void synchronize()
    return () => { active = false }
  }, [userId])

  const completed = useMemo(() => new Set(completedLessonIds), [completedLessonIds])
  const nextLesson = academyLessons.find((lesson) => !completed.has(lesson.id)) ?? academyLessons.at(-1)!

  async function setLessonCompleted(lessonId: string, value: boolean) {
    if (!validLessonIds.has(lessonId)) return

    const next = value
      ? sanitizeAcademyLessonIds([...completedLessonIds, lessonId])
      : completedLessonIds.filter((id) => id !== lessonId)
    setCompletedLessonIds(next)
    writeStoredLessons(userId, next)
    setSyncError(false)

    if (!userId) return
    setSavingLessonId(lessonId)
    const timestamp = new Date().toISOString()
    const result = value
      ? await supabase.from('academy_lesson_progress').upsert({
          user_id: userId,
          lesson_id: lessonId,
          completed_at: timestamp,
          updated_at: timestamp,
        }, { onConflict: 'user_id,lesson_id' })
      : await supabase.from('academy_lesson_progress').delete().eq('user_id', userId).eq('lesson_id', lessonId)

    if (result.error) setSyncError(true)
    setSavingLessonId(null)
  }

  return {
    completed,
    completedCount: completed.size,
    nextLesson,
    totalCount: academyLessons.length,
    loading,
    syncError,
    savingLessonId,
    setLessonCompleted,
  }
}
