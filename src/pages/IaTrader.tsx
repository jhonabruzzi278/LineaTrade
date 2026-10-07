import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/shell/BrandMark'
import { PlanActions } from '../components/traderQuiz/PlanActions'
import { PlanReport } from '../components/traderQuiz/PlanReport'
import { QuizPanel } from '../components/traderQuiz/QuizPanel'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { computeTraderPlan, type TraderPlan } from '../lib/traderPlanEngine'
import { saveRuleDrafts } from '../lib/traderPlanRulesApi'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { loadAndClearQuizAnswers, saveQuizAnswers } from '../lib/traderQuizStorage'
import { buildTraderPackage, downloadBlob } from '../lib/traderPackage'
import type { Json } from '../types/database'

type Phase = 'loading' | 'quiz' | 'result'
type Notice = { tone: 'info' | 'error'; text: string; sistemaLink?: boolean }

// Ruta pública (ver App.tsx: sin <ProtectedRoute>): el cuestionario y el cálculo del
// plan funcionan sin sesión. Solo lo que necesita persistencia (guardar el plan,
// crear reglas, descargar el paquete) depende de `user`. Sin sesión se ve el plan
// con lo esencial en claro y el resto difuminado — ver PlanReport `blurred`.
export default function IaTrader() {
  const { user, loading: authLoading } = useAuth()
  const [phase, setPhase] = useState<Phase>('loading')
  const [plan, setPlan] = useState<TraderPlan | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quizAttempt, setQuizAttempt] = useState(0)
  const [downloading, setDownloading] = useState(false)
  const [creatingRules, setCreatingRules] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

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

      // Login.tsx redirige acá cuando detecta respuestas pendientes de un teaser público
      // completado antes de registrarse: se consumen una sola vez para no repetir el test.
      const pendingAnswers = loadAndClearQuizAnswers()
      if (!pendingAnswers) {
        setPhase('quiz')
        return
      }
      const succeeded = await persistPlan(user.id, pendingAnswers)
      if (cancelled) return
      setPhase(succeeded ? 'result' : 'quiz')
    }

    void init()
    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  async function finishQuiz(answers: Record<string, string>) {
    const computedPlan = computeTraderPlan(answers)
    if (!user) {
      saveQuizAnswers(answers)
      setPlan(computedPlan)
      setPhase('result')
      return
    }
    setSaving(true)
    setError(null)
    const { error: insertError } = await supabase.from('trader_plans').insert({
      user_id: user.id,
      answers: answers as unknown as Json,
      plan: computedPlan as unknown as Json,
    })
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setPlan(computedPlan)
    setNotice(null)
    setPhase('result')
  }

  function retakeQuiz() {
    setPlan(null)
    setNotice(null)
    setError(null)
    setQuizAttempt((n) => n + 1)
    setPhase('quiz')
  }

  async function handleCreateRules() {
    if (!plan || !user) return
    setCreatingRules(true)
    setNotice(null)
    try {
      const { created, skipped } = await saveRuleDrafts(user.id, plan)
      if (created === 0) {
        setNotice({ tone: 'info', text: 'Esas reglas ya estaban en Sistema; no se duplicó ninguna.', sistemaLink: true })
      } else {
        const extra = skipped > 0 ? ` ${skipped} ya existían y se omitieron.` : ''
        setNotice({ tone: 'info', text: `Se crearon ${created} ${created === 1 ? 'regla desactivada' : 'reglas desactivadas'}.${extra}`, sistemaLink: true })
      }
    } catch (err) {
      setNotice({ tone: 'error', text: getErrorMessage(err) })
    } finally {
      setCreatingRules(false)
    }
  }

  async function handleDownload() {
    if (!plan) return
    setDownloading(true)
    setNotice(null)
    try {
      const { blob, filename, includedCsv } = await buildTraderPackage(plan)
      downloadBlob(filename, blob)
      setNotice({
        tone: 'info',
        text: includedCsv
          ? 'Tu paquete está listo. Abre el .zip, pega el contenido de LEEME.md en tu chat de IA favorito, adjunta el CSV de precios incluido y pídele que evalúe tu plan contra ese historial.'
          : 'Tu paquete está listo con tu plan y el prompt para tu IA. Todavía no tenemos una fuente de precios gratuita para esta categoría de instrumento: exporta tú el histórico (por ejemplo desde TradingView) y adjúntalo junto con LEEME.md antes de pedirle el backtest a tu IA.',
      })
    } catch (err) {
      setNotice({ tone: 'error', text: getErrorMessage(err) })
    } finally {
      setDownloading(false)
    }
  }

  const isPublic = !authLoading && !user

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-4 lg:pb-12 lg:pt-6">
      {isPublic && (
        <div className="mb-3 flex min-h-12 items-center justify-between lg:mb-5">
          <BrandMark to="/" />
          <Link to="/login" className="inline-flex min-h-11 items-center px-3 font-body text-[14px] font-bold text-steel">
            Ingresar
          </Link>
        </div>
      )}

      {phase === 'loading' && (
        <div className="space-y-3" aria-busy="true" aria-label="Cargando">
          <div className="h-8 w-40 animate-pulse rounded bg-panel" />
          <div className="h-72 animate-pulse rounded-xl border border-hairline bg-panel" />
        </div>
      )}

      {phase === 'quiz' && (
        <>
          <div className="hidden lg:block">
            <PageHeader
              kicker="análisis"
              title="IA Trader"
              lead="Responde cinco bloques y obtén un plan de trading hecho para ti. Se calcula con reglas, no con un modelo de lenguaje: las mismas respuestas dan siempre el mismo plan."
            />
          </div>
          <QuizPanel key={quizAttempt} onFinish={(answers) => void finishQuiz(answers)} saving={saving} error={error} />
        </>
      )}

      {phase === 'result' && plan && (
        <>
          <PageHeader
            kicker="análisis · IA Trader"
            title="Tu plan"
            lead="Tu plan, calculado con tus respuestas. Es un punto de partida, no una promesa de resultados ni un consejo financiero."
          />
          {error && (
            <p role="alert" className="mb-4 font-body text-[13px] text-loss">
              {error}
            </p>
          )}
          <div className="lg:grid lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-6">
            <PlanReport
              plan={plan}
              blurred={isPublic}
              overlay={
                isPublic ? (
                  <Card className="max-w-sm text-center shadow-elevated">
                    <h2 className="font-display text-[17px] leading-snug text-text-primary">Crea tu cuenta gratis para ver tu plan completo</h2>
                    <p className="mt-2 font-body text-[13px] leading-relaxed text-text-faint">Riesgo, qué esperar, rutina y señales de alerta. Tus respuestas se guardan.</p>
                    <Button asChild variant="cta" size="lg" className="mt-4 w-full">
                      <Link to="/registro">Crear mi cuenta</Link>
                    </Button>
                    <Link to="/login" className="mt-2 inline-flex min-h-11 items-center font-body text-[14px] font-bold text-steel">
                      Ya tengo cuenta
                    </Link>
                  </Card>
                ) : undefined
              }
            />
            {user && (
              <div className="mt-4 lg:mt-0">
                <PlanActions
                  onCreateRules={() => void handleCreateRules()}
                  creatingRules={creatingRules}
                  onDownload={() => void handleDownload()}
                  downloading={downloading}
                  onRetake={retakeQuiz}
                  notice={notice}
                />
              </div>
            )}
          </div>
          <p className="mt-5 max-w-xl font-body text-[12px] leading-relaxed text-text-faint">
            Plan calculado con reglas, sin modelo de lenguaje. No es consejo financiero.
          </p>
        </>
      )}
    </main>
  )
}
