// Resumen de la revisión del proceso de la lección de papermoney. Evalúa cómo
// se ejecutó el trade, no cuánto ganó: no recibe ningún resultado en dinero.

export interface ReviewQuestion {
  id: string
  /** Frase que completa «Faltó…» cuando la respuesta es No. */
  flaw: string
}

export interface ProcessReviewSummary {
  /** Respuestas afirmativas. */
  followed: number
  total: number
  flaws: string[]
  message: string
}

const REPEAT_NOTE = 'Un trade no demuestra nada; lo que importa es si este patrón se repite. Con más trades registrados, tu journal te mostrará si pasa.'

function joinFlaws(flaws: readonly string[]): string {
  if (flaws.length <= 1) return flaws.join('')
  return `${flaws.slice(0, -1).join(', ')} y ${flaws[flaws.length - 1]}`
}

/** `null` mientras falte alguna respuesta. */
export function summarizeProcessReview(
  questions: readonly ReviewQuestion[],
  answers: Readonly<Record<string, boolean>>,
): ProcessReviewSummary | null {
  if (questions.some((question) => answers[question.id] === undefined)) return null

  const flaws = questions.filter((question) => answers[question.id] === false).map((question) => question.flaw)
  const followed = questions.length - flaws.length
  const message =
    flaws.length === 0
      ? `Seguiste tu plan de principio a fin. ${REPEAT_NOTE}`
      : `Esta vez ${joinFlaws(flaws)}: el proceso no quedó del todo como lo planeaste, sin importar cómo terminó el trade. ${REPEAT_NOTE}`
  return { followed, total: questions.length, flaws, message }
}
