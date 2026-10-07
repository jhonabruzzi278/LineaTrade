import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronDown } from 'lucide-react'
import { onboardingSteps } from '../data/onboarding'
import { WizardLayout } from '../components/WizardLayout'
import { buttonVariants } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { FIELD_CLASS } from '../components/ui/field'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { cn } from '@/lib/utils'

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

const STEP_LABELS = ['Experiencia', 'Tipo de cuenta', 'Bróker', 'Instrumentos', 'Objetivos', 'Cómo nos conociste']
const RAIL_NOTE =
  'Usamos tus respuestas solo para calibrar cómo interpretamos tus estadísticas. Puedes cambiarlas después en tu perfil.'

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
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
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
      steps={STEP_LABELS}
      stepIndex={stepIndex}
      railTitle="Tu perfil · 2 minutos"
      railNote={RAIL_NOTE}
      showBrandOnMobile
      onSkip={() => void finishOnboarding()}
      onBack={stepIndex > 0 ? goBack : undefined}
      onNext={goNext}
      nextDisabled={!isAnswered() || saving}
      nextLabel={saving ? 'Guardando…' : isLastStep ? 'Finalizar' : 'Continuar'}
    >
      <h1 className="font-display text-[30px] leading-[1.05] text-text-primary lg:text-[40px]">{step.title}</h1>
      {step.subtitle ? (
        <p className="mb-6 mt-2.5 font-body text-[15px] text-text-faint lg:mb-7 lg:mt-3 lg:text-[16px]">{step.subtitle}</p>
      ) : (
        <div className="mb-6" />
      )}
      {saveError && (
        <p role="alert" className="mb-4 font-body text-[13px] text-loss">
          {saveError}
        </p>
      )}

      {step.type === 'single' && (
        <div role="radiogroup" aria-label={step.title} className="flex flex-col gap-2.5 lg:gap-3">
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
        <div
          role="group"
          aria-label={step.title}
          className={cn('gap-2.5 lg:gap-3', step.options.some((o) => o.hint) ? 'flex flex-col' : 'grid grid-cols-2')}
        >
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
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="onb-broker" className="font-body text-[14px] font-semibold text-text-muted">
              Bróker
            </label>
            <div className="relative">
              <select
                id="onb-broker"
                value={answers.broker ?? ''}
                onChange={(e) => selectSingle('broker', e.target.value)}
                className={cn(FIELD_CLASS, 'min-h-[52px] appearance-none pr-11')}
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
              <ChevronDown
                className="pointer-events-none absolute right-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-faint"
                aria-hidden="true"
              />
            </div>
          </div>

          {answers.broker === 'otro' && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="onb-broker-other" className="font-body text-[14px] font-semibold text-text-muted">
                ¿Cuál bróker?
              </label>
              <input
                id="onb-broker-other"
                type="text"
                value={answers.brokerOther ?? ''}
                onChange={(e) => setAnswers((prev) => ({ ...prev, brokerOther: e.target.value }))}
                placeholder="Nombre de tu bróker"
                className={cn(FIELD_CLASS, 'min-h-[52px]')}
              />
            </div>
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
      className={cn(
        'flex w-full items-center gap-3.5 rounded-xl border bg-panel px-4 text-left transition-colors lg:gap-4 lg:px-5',
        hint ? 'min-h-16 py-3 lg:min-h-[72px]' : 'min-h-14 py-2.5',
        selected ? 'border-2 border-signal bg-signal/10 px-[15px] lg:px-[19px]' : 'border-hairline hover:border-text-faint',
      )}
    >
      {indicator === 'radio' ? (
        <span
          aria-hidden="true"
          className={cn('h-[22px] w-[22px] shrink-0 rounded-full border-2', selected ? 'border-[7px] border-signal bg-on-signal' : 'border-text-faint')}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2',
            selected ? 'border-signal bg-signal text-on-signal' : 'border-text-faint',
          )}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3.4} />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block font-body text-[15px] font-semibold text-text-primary lg:text-[16px]">{label}</span>
        {hint && <span className={cn('mt-0.5 block font-body text-[13px]', selected ? 'text-steel' : 'text-text-faint')}>{hint}</span>}
      </span>
    </button>
  )
}

function OnboardingComplete() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-8 pt-24 lg:justify-center lg:pt-8">
      <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-2 border-ink bg-gain shadow-[5px_5px_0_var(--color-pop)]">
        <Check className="h-[42px] w-[42px] text-ink" strokeWidth={2.8} aria-hidden="true" />
      </span>
      <p className="label-mono mt-8 text-gain">Todo listo</p>
      <h1 className="font-display mt-2.5 text-[36px] leading-[1.04] text-text-primary">Tu bitácora está lista</h1>
      <p className="mt-3 font-body text-[16px] leading-relaxed text-text-faint">
        Explora tu dashboard y registra tu primer trade cuando quieras.
      </p>
      <Card className="mt-7 px-[18px] py-4">
        <p className="label-mono">Un buen primer paso</p>
        <p className="mt-1.5 font-body text-[15px] leading-normal text-text-muted">
          Sube la captura de tu último trade: la IA completa los datos y tú los confirmas.
        </p>
      </Card>
      <div className="mt-8 flex flex-col gap-2.5">
        <Link to="/nuevo-trade" className={cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'w-full')}>
          Registrar mi primer trade
        </Link>
        <Link to="/dashboard" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'w-full')}>
          Ir a mi Dashboard
        </Link>
      </div>
    </main>
  )
}
