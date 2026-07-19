import { useState } from 'react'

// Extraído para el quiz de IA-trader porque Onboarding.tsx y NuevoTrade.tsx ya
// duplican a mano la misma lógica de stepIndex/goNext/goBack — una tercera
// copia para un quiz de 19 pasos era la señal de dedup. Deliberadamente no se
// migran esas dos páginas a este hook: ya están verificadas end-to-end y
// tocarlas está fuera de alcance de este cambio.
export interface UseWizardResult<TStepId extends string> {
  stepIndex: number
  currentStepId: TStepId
  answers: Record<string, string>
  setAnswer: (id: string, value: string) => void
  goNext: () => void
  goBack: () => void
  isFirstStep: boolean
  isLastStep: boolean
  progressPercent: number
}

export function useWizard<TStepId extends string>(stepIds: TStepId[]): UseWizardResult<TStepId> {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }))
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, stepIds.length - 1))
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  return {
    stepIndex,
    currentStepId: stepIds[stepIndex],
    answers,
    setAnswer,
    goNext,
    goBack,
    isFirstStep: stepIndex === 0,
    isLastStep: stepIndex === stepIds.length - 1,
    progressPercent: ((stepIndex + 1) / stepIds.length) * 100,
  }
}
