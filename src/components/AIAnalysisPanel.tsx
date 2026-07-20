import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { analyzeTradeWithAI, type AIAnalysisResponse } from '../lib/aiAnalysis'

const FREE_TIER_DAILY_LIMIT = 3

const DATA_SUFFICIENCY_LABELS: Record<AIAnalysisResponse['data_sufficiency'], string> = {
  insufficient: 'Datos insuficientes',
  limited: 'Datos limitados',
  sufficient: 'Datos suficientes',
}

interface Props {
  tradeId: string
  initialAnalysis: { responseText: string; createdAt: string } | null
}

function parseStoredAnalysis(responseText: string): AIAnalysisResponse | null {
  try {
    return JSON.parse(responseText) as AIAnalysisResponse
  } catch {
    return null
  }
}

export function AIAnalysisPanel({ tradeId, initialAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<AIAnalysisResponse | null>(
    initialAnalysis ? parseStoredAnalysis(initialAnalysis.responseText) : null,
  )
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(initialAnalysis?.createdAt ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usedToday, setUsedToday] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadQuota() {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('ai_usage_daily')
        .select('requests_count')
        .eq('usage_date', today)
        .maybeSingle()
      if (!cancelled) setUsedToday(data?.requests_count ?? 0)
    }
    void loadQuota()
    return () => {
      cancelled = true
    }
  }, [analyzedAt])

  async function handleAnalyze() {
    setLoading(true)
    setError(null)
    const result = await analyzeTradeWithAI(tradeId)
    setLoading(false)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setAnalysis(result.data)
    setAnalyzedAt(new Date().toISOString())
  }

  const quotaExhausted = usedToday != null && usedToday >= FREE_TIER_DAILY_LIMIT

  return (
    <div>
      {analysis && (
        <div className="border border-hairline rounded-sm bg-panel px-5 py-4 mb-4">
          {analysis.data_sufficiency !== 'sufficient' && (
            <p className="font-mono text-[11px] text-signal tracking-wide mb-3">
              {DATA_SUFFICIENCY_LABELS[analysis.data_sufficiency]}
            </p>
          )}
          <p className="font-body text-[14px] text-text-primary mb-3">{analysis.interpretation}</p>
          {analysis.observation && (
            <p className="font-body text-[13px] text-text-muted mb-3 border-l-2 border-signal pl-3">
              {analysis.observation}
            </p>
          )}
          {analysis.behavioral_suggestion && (
            <p className="font-body text-[13px] text-text-muted mb-3">{analysis.behavioral_suggestion}</p>
          )}
          {analysis.facts_cited.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {analysis.facts_cited.map((fact, i) => (
                <span
                  key={`${fact.field_path}-${i}`}
                  className="font-mono text-[10px] px-2 py-1 rounded-sm border border-hairline text-text-faint"
                  title={fact.field_path}
                >
                  {fact.field_path.split('.').pop()}: {fact.value}
                </span>
              ))}
            </div>
          )}
          {analyzedAt && (
            <p className="font-mono text-[11px] text-text-faint mt-3">
              {new Date(analyzedAt).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          )}
        </div>
      )}

      {!analysis && !loading && (
        <p className="font-body text-[13px] text-text-faint mb-4">
          Sin análisis todavía para este trade.
        </p>
      )}

      {error && <p className="font-body text-[13px] text-loss mb-3">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleAnalyze()}
          disabled={loading || quotaExhausted}
          className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
        >
          {loading ? 'Analizando...' : analysis ? 'Reanalizar' : 'Analizar con IA'}
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
