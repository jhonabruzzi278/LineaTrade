import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { generateInsights, getLatestInsights, type Insight } from '../lib/insights'
import { getErrorMessage } from '../lib/errors'

const FREE_TIER_DAILY_LIMIT = 3

type DataSufficiency = 'sufficient' | 'limited' | 'insufficient'

const DATA_SUFFICIENCY_LABELS: Record<DataSufficiency, string> = {
  insufficient: 'Datos insuficientes todavía',
  limited: 'Datos limitados',
  sufficient: 'Datos suficientes',
}

function isDataSufficiency(value: unknown): value is DataSufficiency {
  return value === 'sufficient' || value === 'limited' || value === 'insufficient'
}

// Sección de Módulo 9 real (ver auditoría del spec): a diferencia de
// AIAnalysisPanel.tsx (un trade a la vez), esto mina TODO el historial cerrado del
// usuario buscando patrones — día de semana, hora, confluencia, psicología, activo.
export function InsightsSection() {
  const { user } = useAuth()
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [dataSufficiency, setDataSufficiency] = useState<DataSufficiency | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedToday, setUsedToday] = useState<number | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadInitial() {
      try {
        const stored = await getLatestInsights(user!.id)
        if (cancelled) return
        if (stored) {
          setInsights(stored.insights as unknown as Insight[])
          setGeneratedAt(stored.created_at)
          const snapshot = stored.context_snapshot as unknown as { meta?: { data_sufficiency?: unknown } }
          const sufficiency = snapshot?.meta?.data_sufficiency
          if (isDataSufficiency(sufficiency)) setDataSufficiency(sufficiency)
        }
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

  useEffect(() => {
    let cancelled = false
    async function loadQuota() {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('ai_usage_daily').select('requests_count').eq('usage_date', today).maybeSingle()
      if (!cancelled) setUsedToday(data?.requests_count ?? 0)
    }
    void loadQuota()
    return () => {
      cancelled = true
    }
  }, [generatedAt])

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

  const quotaExhausted = usedToday != null && usedToday >= FREE_TIER_DAILY_LIMIT

  return (
    <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel shadow-card px-5 py-5 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-signal" />
        <h2 className="font-display text-[18px] text-text-primary">Insights</h2>
      </div>

      {!initializing && dataSufficiency && dataSufficiency !== 'sufficient' && (
        <p className="font-mono text-[11px] text-signal tracking-wide mb-3">{DATA_SUFFICIENCY_LABELS[dataSufficiency]}</p>
      )}

      {!initializing && insights && insights.length > 0 && (
        <ul className="space-y-3 mb-4">
          {insights.map((insight, i) => (
            <li key={i} className="border-l-2 border-signal pl-3">
              <p className="font-body text-[14px] text-text-primary">{insight.text}</p>
              {insight.facts_cited.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {insight.facts_cited.map((fact, j) => (
                    <span
                      key={`${fact.field_path}-${j}`}
                      className="font-mono text-[10px] px-2 py-0.5 rounded-sm border border-hairline text-text-faint"
                      title={fact.field_path}
                    >
                      {fact.field_path.split('.').pop()}: {fact.value}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {!initializing && insights && insights.length === 0 && (
        <p className="font-body text-[13px] text-text-faint mb-4">
          Todavía no encontramos un patrón lo bastante fuerte como para mostrarlo — segui registrando trades.
        </p>
      )}

      {!initializing && !insights && (
        <p className="font-body text-[13px] text-text-faint mb-4">Sin insights generados todavía.</p>
      )}

      {error && <p className="font-body text-[13px] text-loss mb-3">{error}</p>}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading || quotaExhausted || initializing}
          className="font-body text-[13px] px-4 py-2.5 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
        >
          {loading ? 'Analizando...' : insights ? 'Regenerar insights' : 'Generar insights'}
        </button>
        {usedToday != null && (
          <span className="font-mono text-[11px] text-text-faint">
            {usedToday}/{FREE_TIER_DAILY_LIMIT} análisis gratuitos usados hoy ·{' '}
            <Link to="/configuracion/ia" className="text-text-faint hover:text-text-muted underline">
              usar mi propia key
            </Link>
          </span>
        )}
      </div>
    </div>
  )
}
