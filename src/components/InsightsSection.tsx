import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { generateInsights, getLatestInsights, type Insight } from '../lib/insights'
import { getErrorMessage } from '../lib/errors'
import { factName, progressToMinimum, MIN_TRADES_FOR_INSIGHTS, sufficiencyFromCount, sufficiencyLabel, type DataSufficiency } from '../lib/insightsView'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { Button } from './ui/button'
import { Callout } from './ui/callout'
import { Card } from './ui/card'
import { ProgressBar } from './ui/progress-bar'
import { Tag } from './ui/tag'
import { cn } from '@/lib/utils'

const FALLBACK_DAILY_LIMIT = 3

const SUFFICIENCY_TONE = { sufficient: 'brand', limited: 'spark', insufficient: 'neutral' } as const

// Cifras citadas por el motor: cada chip es un dato literal del contexto (`facts_cited`),
// no una frase de la IA. Sobre el amarillo se oscurecen para mantener contraste.
function FactChips({ insight, onSpark = false }: { insight: Insight; onSpark?: boolean }) {
  if (insight.facts_cited.length === 0) return null
  return (
    <ul className="mt-3.5 flex flex-wrap gap-1.5" aria-label="Datos citados">
      {insight.facts_cited.map((fact, j) => (
        <li
          key={`${fact.field_path}-${j}`}
          title={fact.field_path}
          className={cn(
            'num rounded-md border px-2.5 py-1.5 text-[11px] sm:text-[12px]',
            onSpark ? 'border-on-spark/25 bg-on-spark/10 text-on-spark' : 'border-hairline bg-ink text-steel',
          )}
        >
          {factName(fact.field_path)}: <b className={cn('font-semibold', onSpark ? 'text-on-spark' : 'text-text-primary')}>{fact.value}</b>
        </li>
      ))}
    </ul>
  )
}

function InsightList({ insights }: { insights: Insight[] }) {
  const [first, ...rest] = insights
  return (
    <div className="space-y-3 sm:space-y-4">
      <Card tone="spark" as="article" className="px-[18px] py-4 sm:px-[26px] sm:py-[22px]">
        <p className="label-mono !text-on-spark/70 font-semibold">Qué revisar primero</p>
        <p className="mt-2 font-body text-[18px] font-bold leading-snug sm:text-[22px]">{first.text}</p>
        <FactChips insight={first} onSpark />
      </Card>
      {rest.map((insight, i) => (
        <Card key={i} as="article" className="border-l-[3px] border-l-signal px-4 py-3.5 sm:px-6 sm:py-5">
          <p className="font-body text-[15px] font-semibold leading-snug text-text-primary sm:text-[18px]">{insight.text}</p>
          <FactChips insight={insight} />
        </Card>
      ))}
    </div>
  )
}

function InsightsEmpty({ closedTrades }: { closedTrades: number }) {
  return (
    <Card tone="dashed" className="px-[22px] py-[30px] text-center">
      <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full bg-panel-2 text-steel">
        <Sparkles size={24} aria-hidden="true" />
      </div>
      <h2 className="font-display mt-4 text-[19px] leading-tight text-text-primary">Aún no hay un patrón lo bastante fuerte</h2>
      <p className="mx-auto mt-2.5 max-w-md font-body text-[14px] leading-relaxed text-text-faint">
        Todavía no encontramos un patrón lo bastante fuerte como para mostrarlo. Sigue registrando trades.
      </p>
      <ProgressBar value={progressToMinimum(closedTrades)} label="Avance hacia los trades mínimos" className="mx-auto mt-5 max-w-sm" />
      <p className="num mt-2 text-[11px] text-text-faint">
        {Math.min(closedTrades, MIN_TRADES_FOR_INSIGHTS)} de {MIN_TRADES_FOR_INSIGHTS} trades cerrados para empezar
      </p>
    </Card>
  )
}

// Mina TODO el historial cerrado del usuario buscando patrones (día de la semana, hora,
// confluencia, psicología, activo). A diferencia de AIAnalysisPanel (un trade a la vez),
// el backend calcula las cifras y la IA solo las ordena y las redacta.
export function InsightsSection({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [closedTrades, setClosedTrades] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const usedToday = useAiUsageToday(compact ? undefined : user?.id)
  const { byFeature } = useEntitlements(compact ? undefined : user?.id)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadInitial() {
      try {
        const [stored, stats] = await Promise.all([
          getLatestInsights(user!.id),
          supabase.from('v_user_trade_stats').select('closed_trades').eq('user_id', user!.id).maybeSingle(),
        ])
        if (cancelled) return
        if (stored) {
          setInsights(stored.insights as unknown as Insight[])
          setGeneratedAt(stored.created_at)
        }
        setClosedTrades(stats.data?.closed_trades ?? 0)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void loadInitial()
    return () => {
      cancelled = true
    }
  }, [user])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generateInsights()
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setInsights(result.insights)
    setGeneratedAt(new Date().toISOString())
  }

  const sufficiency: DataSufficiency | null = closedTrades == null ? null : sufficiencyFromCount(closedTrades)

  if (compact) {
    const primaryInsight = insights?.[0]
    return (
      <section className="border-t border-hairline pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-steel" aria-hidden="true" />
            <h2 className="font-display text-[16px] text-text-primary">Qué revisar</h2>
          </div>
          <Link to="/insights" className="font-body text-[12px] font-semibold text-steel hover:underline">
            Ver insights
          </Link>
        </div>

        {initializing && <p className="font-body text-[13px] text-text-faint">Buscando tu último insight...</p>}
        {!initializing && primaryInsight && (
          <div className="border-l-2 border-signal pl-3 reveal-up">
            <p className="font-body text-[14px] leading-relaxed text-text-primary">{primaryInsight.text}</p>
            {sufficiency && sufficiency !== 'sufficient' && <p className="num mt-2 text-[10px] text-text-faint">{sufficiencyLabel(sufficiency, null)}</p>}
          </div>
        )}
        {!initializing && !primaryInsight && (
          <p className="font-body text-[13px] text-text-faint">Aún no hay un patrón guardado. Genera el primero desde Insights.</p>
        )}
        {error && <p className="mt-2 font-body text-[12px] text-loss">{error}</p>}
      </section>
    )
  }

  const dailyLimit = byFeature.get('ai_actions')?.hardLimit === undefined ? FALLBACK_DAILY_LIMIT : (byFeature.get('ai_actions')?.hardLimit ?? null)
  const quotaExhausted = dailyLimit != null && usedToday != null && usedToday >= dailyLimit
  const notEnoughData = sufficiency === 'insufficient'
  const hasInsights = insights != null && insights.length > 0

  if (initializing) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Cargando insights">
        <div className="h-5 w-48 animate-pulse rounded bg-panel" />
        <div className="h-36 animate-pulse rounded-xl border border-hairline bg-panel" />
        <div className="h-24 animate-pulse rounded-xl border border-hairline bg-panel" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {sufficiency && closedTrades != null && <Tag tone={SUFFICIENCY_TONE[sufficiency]} className="self-start">{sufficiencyLabel(sufficiency, closedTrades).toUpperCase()}</Tag>}

      {sufficiency === 'limited' && (
        <Callout tone="warning">Con pocos trades cerrados los patrones pueden ser casualidad. Léelos como pistas para revisar, no como conclusiones.</Callout>
      )}

      {notEnoughData && closedTrades != null && <InsightsEmpty closedTrades={closedTrades} />}
      {!notEnoughData && hasInsights && <InsightList insights={insights} />}
      {!notEnoughData && !hasInsights && (
        <Card tone="dashed" className="px-6 py-8 text-center">
          <p className="font-body text-[14px] leading-relaxed text-text-faint">
            {insights == null
              ? 'Todavía no has generado insights. Genera el primero con tus trades cerrados.'
              : 'Todavía no encontramos un patrón lo bastante fuerte como para mostrarlo. Sigue registrando trades.'}
          </p>
        </Card>
      )}

      {error && (
        <p role="alert" className="font-body text-[13px] text-loss">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
        {notEnoughData ? (
          <>
            <Button asChild variant="cta" size="lg" className="w-full sm:w-auto">
              <Link to="/nuevo-trade">Registrar un trade</Link>
            </Button>
            <Button variant="outline" size="lg" disabled className="w-full sm:w-auto">
              Generar insights
            </Button>
          </>
        ) : (
          <Button variant="cta" size="lg" onClick={() => void handleGenerate()} disabled={loading || quotaExhausted} className="w-full sm:w-auto">
            <RefreshCw size={17} aria-hidden="true" className={loading ? 'animate-spin' : undefined} />
            {loading ? 'Analizando...' : generatedAt ? 'Regenerar insights' : 'Generar insights'}
          </Button>
        )}
        {dailyLimit != null && usedToday != null && !notEnoughData && (
          <span className="num text-[12px] text-text-faint">
            {usedToday}/{dailyLimit} análisis gratuitos usados hoy ·{' '}
            <Link to="/configuracion/ia" className="underline hover:text-text-muted">
              usar mi propia key
            </Link>
          </span>
        )}
      </div>
      {quotaExhausted && <p className="font-body text-[12px] text-text-faint">Alcanzaste el límite diario. Vuelve mañana o conecta tu propia key en Configuración IA.</p>}

      <p className="max-w-xl font-body text-[12px] leading-relaxed text-text-faint">
        Los insights describen lo que ocurrió en tus operaciones. No son señales ni asesoría financiera.
      </p>
    </div>
  )
}
