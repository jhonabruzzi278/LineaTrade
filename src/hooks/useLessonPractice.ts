import { useCallback, useEffect, useState } from 'react'
import type { TradeDirection } from '../lib/positionSize'

// Progreso de la práctica de una lección (pasos marcados, plan guardado y
// revisión del proceso). Vive solo en este dispositivo: es un cuaderno de
// práctica, no un dato del journal, y todavía no tiene tabla en el backend.

export interface SavedTradePlan {
  symbol: string
  direction: TradeDirection
  entry: number
  stop: number
  target: number
  size: number
  riskAmount: number
  balance: number
  riskPercent: number
}

export interface LessonPracticeState {
  doneSteps: string[]
  plan: SavedTradePlan | null
  answers: Record<string, boolean>
}

const EMPTY_STATE: LessonPracticeState = { doneSteps: [], plan: null, answers: {} }
const STORAGE_PREFIX = 'lineatrade:academy-practice:v1'

function storageKey(userId: string | undefined, lessonId: string): string {
  return `${STORAGE_PREFIX}:${userId ?? 'guest'}:${lessonId}`
}

function isPlan(value: unknown): value is SavedTradePlan {
  if (typeof value !== 'object' || value === null) return false
  const plan = value as Record<string, unknown>
  return (
    typeof plan.symbol === 'string' &&
    (plan.direction === 'long' || plan.direction === 'short') &&
    ['entry', 'stop', 'target', 'size', 'riskAmount', 'balance', 'riskPercent'].every((key) => typeof plan[key] === 'number')
  )
}

/** Lee y sanea lo guardado: cualquier dato corrupto se descarta, nunca rompe la lección. */
export function parsePracticeState(raw: string | null): LessonPracticeState {
  if (!raw) return EMPTY_STATE
  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return EMPTY_STATE
    const record = parsed as Record<string, unknown>
    const doneSteps = Array.isArray(record.doneSteps) ? record.doneSteps.filter((id): id is string => typeof id === 'string') : []
    const answers: Record<string, boolean> = {}
    if (typeof record.answers === 'object' && record.answers !== null) {
      for (const [key, value] of Object.entries(record.answers)) if (typeof value === 'boolean') answers[key] = value
    }
    return { doneSteps, plan: isPlan(record.plan) ? record.plan : null, answers }
  } catch {
    return EMPTY_STATE
  }
}

function readState(userId: string | undefined, lessonId: string): LessonPracticeState {
  try {
    return parsePracticeState(localStorage.getItem(storageKey(userId, lessonId)))
  } catch {
    return EMPTY_STATE
  }
}

export function useLessonPractice(userId: string | undefined, lessonId: string) {
  const [state, setState] = useState<LessonPracticeState>(() => readState(userId, lessonId))

  useEffect(() => {
    setState(readState(userId, lessonId))
  }, [userId, lessonId])

  const update = useCallback(
    (change: (current: LessonPracticeState) => LessonPracticeState) => {
      setState((current) => {
        const next = change(current)
        try {
          localStorage.setItem(storageKey(userId, lessonId), JSON.stringify(next))
        } catch {
          // Sin almacenamiento (modo privado, cuota): la práctica sigue en memoria.
        }
        return next
      })
    },
    [userId, lessonId],
  )

  const setStepDone = useCallback(
    (stepId: string, done: boolean) =>
      update((current) => ({
        ...current,
        doneSteps: done
          ? current.doneSteps.includes(stepId) ? current.doneSteps : [...current.doneSteps, stepId]
          : current.doneSteps.filter((id) => id !== stepId),
      })),
    [update],
  )

  const savePlan = useCallback(
    (plan: SavedTradePlan) =>
      update((current) => ({
        ...current,
        plan,
        doneSteps: current.doneSteps.includes('plan') ? current.doneSteps : [...current.doneSteps, 'plan'],
      })),
    [update],
  )

  const setAnswer = useCallback(
    (questionId: string, value: boolean) => update((current) => ({ ...current, answers: { ...current.answers, [questionId]: value } })),
    [update],
  )

  const resetReview = useCallback(
    () => update((current) => ({ ...current, answers: {}, doneSteps: current.doneSteps.filter((id) => id !== 'revision') })),
    [update],
  )

  return { state, setStepDone, savePlan, setAnswer, resetReview }
}
