import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNav } from '../components/BottomNav'
import { WizardLayout } from '../components/WizardLayout'
import { QuizStep } from '../components/traderQuiz/QuizStep'
import { PlanReport } from '../components/traderQuiz/PlanReport'
import { useWizard } from '../hooks/useWizard'
import { traderQuizBlocks, traderQuizQuestions } from '../data/traderQuiz'
import { computeTraderPlan, type TraderPlan } from '../lib/traderPlanEngine'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { loadAndClearQuizAnswers, saveQuizAnswers } from '../lib/traderQuizStorage'
import { buildTraderPackage, downloadBlob } from '../lib/traderPackage'
import type { Json } from '../types/database'

const QUESTION_IDS = traderQuizQuestions.map((q) => q.id)

type Phase = 'loading' | 'quiz' | 'result'

// Ruta pública (ver App.tsx — NO está envuelta en <ProtectedRoute>): el test y
// el cálculo del plan funcionan sin sesión. Solo lo que requiere persistencia
// (guardar el plan, saltarse el test la próxima vez, descargar el paquete)
// está condicionado a `user`. Sin sesión se muestra un teaser con el plan
// parcialmente tapado — ver PlanReport's prop `blurred`.
export default function IaTrader() {
  const { user, loading: authLoading } = useAuth()
  const wizard = useWizard(QUESTION_IDS)
  const [phase, setPhase] = useState<Phase>('loading')
  const [plan, setPlan] = useState<TraderPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    async function init() {
      if (!user) {
        setPhase('quiz')
        return
      }
      const { data, error: fetchError } = await supabase
        .from('trader_plans')
        .select('plan')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (cancelled) return
      if (fetchError) {
        setError(getErrorMessage(fetchError))
        setPhase('quiz')
        return
      }
      if (data) {
        setPlan(data.plan as unknown as TraderPlan)
        setPhase('result')
        return
      }

      // Login.tsx redirige acá cuando detecta respuestas pendientes de un
      // teaser público completado antes de registrarse — las consumimos una
      // sola vez (loadAndClearQuizAnswers las borra) para no repetir el quiz.
      const pendingAnswers = loadAndClearQuizAnswers()
      if (!pendingAnswers) {
        setPhase('quiz')
        return
      }
      const succeeded = await persistPlan(user.id, pendingAnswers)
      if (cancelled) return
      setPhase(succeeded ? 'result' : 'quiz')
    }

    async function persistPlan(userId: string, answers: Record<string, string>): Promise<boolean> {
      const computedPlan = computeTraderPlan(answers)
      setSaving(true)
      setError(null)
      const { error: insertError } = await supabase.from('trader_plans').insert({
        user_id: userId,
        answers: answers as unknown as Json,
        plan: computedPlan as unknown as Json,
      })
      setSaving(false)
      if (insertError) {
        setError(getErrorMessage(insertError))
        return false
      }
      setPlan(computedPlan)
      return true
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  const currentQuestion = traderQuizQuestions[wizard.stepIndex]
  const currentBlock = traderQuizBlocks.find((b) => b.id === currentQuestion.blockId)
  const isAnswered = Boolean(wizard.answers[currentQuestion.id])

  async function finishQuiz() {
    const computedPlan = computeTraderPlan(wizard.answers)
    if (!user) {
      saveQuizAnswers(wizard.answers)
      setPlan(computedPlan)
      setPhase('result')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('trader_plans').insert({
      user_id: user.id,
      answers: wizard.answers,
      plan: computedPlan as unknown as Json,
    })
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setPlan(computedPlan)
    setPhase('result')
  }

  function handleNext() {
    if (wizard.isLastStep) {
      void finishQuiz()
      return
    }
    wizard.goNext()
  }

  function retakeQuiz() {
    setPlan(null)
    setPhase('quiz')
  }

  async function handleDownload() {
    if (!plan) return
    setDownloading(true)
    setDownloadNotice(null)
    try {
      const { blob, filename, includedCsv } = await buildTraderPackage(plan)
      downloadBlob(filename, blob)
      setDownloadNotice(
        includedCsv
          ? 'Tu paquete está listo. Abre el .zip, pega el contenido de LEEME.md en tu chat de IA favorito, adjunta el CSV de precios incluido, y pídele que evalúe tu plan contra ese historial.'
          : 'Tu paquete está listo con tu plan y el prompt para tu IA. Todavía no tenemos una fuente de precios gratuita para esta categoría de instrumento — exporta tú el histórico (por ejemplo desde TradingView) y adjúntalo junto con LEEME.md antes de pedirle el backtest a tu IA.',
      )
    } catch (err) {
      setDownloadNotice(getErrorMessage(err))
    } finally {
      setDownloading(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <p className="font-body text-[14px] text-text-muted">Cargando...</p>
      </div>
    )
  }

  if (phase === 'quiz') {
    return (
      <WizardLayout
        stepLabel={currentBlock ? currentBlock.title : `pregunta ${wizard.stepIndex + 1}`}
        progressPercent={wizard.progressPercent}
        onBack={!wizard.isFirstStep ? wizard.goBack : undefined}
        onNext={handleNext}
        nextDisabled={!isAnswered || saving}
        nextLabel={saving ? 'Calculando...' : wizard.isLastStep ? 'Ver mi plan' : 'Continuar'}
      >
        <p className="font-mono text-[12px] text-text-faint mb-2">
          pregunta {wizard.stepIndex + 1} de {QUESTION_IDS.length}
        </p>
        <h1 className="font-display text-[24px] text-text-primary mb-8">{currentQuestion.title}</h1>
        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}
        <QuizStep
          question={currentQuestion}
          selectedValue={wizard.answers[currentQuestion.id]}
          onSelect={(value) => wizard.setAnswer(currentQuestion.id, value)}
        />
      </WizardLayout>
    )
  }

  if (!plan) return null // guard defensivo — no debería alcanzarse

  return (
    <div className="min-h-screen bg-ink">
      {user && <AppHeader />}
      <main className="max-w-xl mx-auto px-6 py-10 pb-32">
        <p className="font-mono text-[13px] text-signal mb-2">tu plan de trading</p>
        <h1 className="font-display text-[28px] text-text-primary mb-8">Convierte la IA en tu trader</h1>
        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}

        <PlanReport plan={plan} blurred={!user} />

        {user ? (
          <div className="mt-8">
            {downloadNotice && (
              <p className="font-body text-[13px] text-text-muted mb-4 border-l-2 border-signal pl-3">
                {downloadNotice}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void handleDownload()}
                disabled={downloading}
                className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
              >
                {downloading ? 'Preparando paquete...' : 'Descargar paquete para tu IA'}
              </button>
              <button
                type="button"
                onClick={retakeQuiz}
                className="font-body text-[13px] px-4 py-2.5 rounded-sm border border-hairline text-text-muted hover:border-text-faint hover:text-text-primary transition-colors"
              >
                Rehacer test
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <Link
              to="/registro"
              className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
            >
              Regístrate gratis para tu plan completo
            </Link>
          </div>
        )}
      </main>
      {user && <BottomNav />}
    </div>
  )
}
