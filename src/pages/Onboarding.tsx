import { useState } from 'react'
import { Link } from 'react-router-dom'
import { onboardingSteps } from '../data/onboarding'
import { WizardLayout } from '../components/WizardLayout'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

type SingleAnswerKey = 'experience' | 'accountType' | 'source'
type MultiAnswerKey = 'instruments' | 'goals'

interface Answers {
  experience?: string
  accountType?: string
  broker?: string
  brokerOther?: string
  instruments: string[]
  goals: string[]
  source?: string
}

const initialAnswers: Answers = { instruments: [], goals: [] }

// Se muestra tras el primer login cuando profiles.onboarding_done = false
// (ver ProtectedRoute + la lógica de redirección en Login.tsx).
export default function Onboarding() {
  const { user } = useAuth()
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const step = onboardingSteps[stepIndex]
  const isLastStep = stepIndex === onboardingSteps.length - 1

  function selectSingle(stepId: SingleAnswerKey | 'broker', value: string) {
    setAnswers((prev) => ({ ...prev, [stepId]: value }))
  }

  function toggleMulti(stepId: MultiAnswerKey, value: string) {
    setAnswers((prev) => {
      const current = prev[stepId]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [stepId]: next }
    })
  }

  function isAnswered(): boolean {
    if (step.type === 'multi') {
      return answers[step.id as MultiAnswerKey].length > 0
    }
    if (step.id === 'broker') {
      if (!answers.broker) return false
      return answers.broker !== 'otro' || Boolean(answers.brokerOther?.trim())
    }
    return Boolean(answers[step.id as SingleAnswerKey])
  }

  async function finishOnboarding() {
    if (!user) return
    setSaving(true)
    setSaveError(null)
    const broker = answers.broker === 'otro' && answers.brokerOther ? `custom:${answers.brokerOther}` : answers.broker
    const { error } = await supabase
      .from('profiles')
      .update({
        trading_experience: answers.experience ?? null,
        account_type: answers.accountType ?? null,
        primary_broker: broker ?? null,
        traded_instruments: answers.instruments,
        onboarding_goals: answers.goals,
        acquisition_source: answers.source ?? null,
        onboarding_done: true,
      })
      .eq('id', user.id)
    setSaving(false)
    if (error) {
      setSaveError(getErrorMessage(error))
      return
    }
    setDone(true)
  }

  function goNext() {
    if (isLastStep) {
      void finishOnboarding()
      return
    }
    setStepIndex((i) => i + 1)
  }

  function goBack() {
    setStepIndex((i) => Math.max(0, i - 1))
  }

  if (done) {
    return <OnboardingComplete />
  }

  return (
    <WizardLayout
      stepLabel={`paso ${stepIndex + 1} de ${onboardingSteps.length}`}
      progressPercent={((stepIndex + 1) / onboardingSteps.length) * 100}
      onSkip={() => void finishOnboarding()}
      onBack={stepIndex > 0 ? goBack : undefined}
      onNext={goNext}
      nextDisabled={!isAnswered() || saving}
      nextLabel={saving ? 'Guardando...' : isLastStep ? 'Finalizar' : 'Continuar'}
    >
      <h1 className="font-display text-[26px] text-text-primary mb-2">{step.title}</h1>
        {step.subtitle && (
          <p className="font-body text-[14px] text-text-muted mb-8">{step.subtitle}</p>
        )}
        {saveError && (
          <p className="font-body text-[13px] text-red-400 mb-6">{saveError}</p>
        )}

        {step.type === 'single' && (
          <div role="radiogroup" aria-label={step.title} className="space-y-3">
            {step.options.map((option) => (
              <OptionButton
                key={option.value}
                role="radio"
                indicator="radio"
                label={option.label}
                hint={option.hint}
                selected={answers[step.id as SingleAnswerKey] === option.value}
                onClick={() => selectSingle(step.id as SingleAnswerKey, option.value)}
              />
            ))}
          </div>
        )}

        {step.type === 'multi' && (
          <div role="group" aria-label={step.title} className="space-y-3">
            {step.options.map((option) => (
              <OptionButton
                key={option.value}
                role="checkbox"
                indicator="checkbox"
                label={option.label}
                hint={option.hint}
                selected={answers[step.id as MultiAnswerKey].includes(option.value)}
                onClick={() => toggleMulti(step.id as MultiAnswerKey, option.value)}
              />
            ))}
          </div>
        )}

        {step.type === 'broker' && (
          <div className="space-y-4">
            <select
              value={answers.broker ?? ''}
              onChange={(e) => selectSingle('broker', e.target.value)}
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary focus:outline-none focus:border-signal transition-colors"
            >
              <option value="" disabled>
                Selecciona un bróker
              </option>
              {step.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {answers.broker === 'otro' && (
              <input
                type="text"
                value={answers.brokerOther ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, brokerOther: e.target.value }))}
                placeholder="¿Cuál?"
                className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
              />
            )}
          </div>
        )}
    </WizardLayout>
  )
}

interface OptionButtonProps {
  label: string
  hint?: string
  selected: boolean
  onClick: () => void
  role: 'radio' | 'checkbox'
  indicator: 'radio' | 'checkbox'
}

function OptionButton({ label, hint, selected, onClick, role, indicator }: OptionButtonProps) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-sm border transition-colors ${
        selected ? 'border-signal bg-signal/10' : 'border-hairline bg-panel hover:border-text-faint'
      }`}
    >
      <span
        className={`shrink-0 flex items-center justify-center w-4 h-4 border ${
          indicator === 'radio' ? 'rounded-full' : 'rounded-sm'
        } ${selected ? 'border-signal bg-signal' : 'border-hairline'}`}
      >
        {selected && indicator === 'checkbox' && (
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path
              d="M1 5 L4 8 L9 2"
              fill="none"
              stroke="#0A0D12"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span className="flex-1">
        <span className="block font-body text-[15px] text-text-primary">{label}</span>
        {hint && <span className="block font-mono text-[12px] text-text-faint mt-0.5">{hint}</span>}
      </span>
    </button>
  )
}

function OnboardingComplete() {
  return (
    <div className="min-h-screen bg-ink">
      <main className="max-w-md mx-auto px-6 pt-24 text-center">
        <p className="font-mono text-[13px] text-signal mb-4">todo listo</p>
        <h1 className="font-display text-[26px] text-text-primary mb-3">Tu bitácora está lista</h1>
        <p className="font-body text-[15px] text-text-muted leading-relaxed">
          Ya puedes registrar tu primer trade.
        </p>
        <Link
          to="/nuevo-trade"
          className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors mt-8"
        >
          Registrar mi primer trade
        </Link>
      </main>
    </div>
  )
}
