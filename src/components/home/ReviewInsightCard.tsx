import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { Card } from '../ui/card'
import { getLatestInsights } from '../../lib/insights'

interface StoredInsight {
  text: string
  closedTrades: number | null
}

type LoadState = { status: 'loading' } | { status: 'ready'; insight: StoredInsight | null } | { status: 'error' }

function readInsight(row: Awaited<ReturnType<typeof getLatestInsights>>): StoredInsight | null {
  if (!row || !Array.isArray(row.insights)) return null
  const first = row.insights.find(
    (item): item is { text: string } =>
      typeof item === 'object' && item !== null && 'text' in item && typeof (item as { text: unknown }).text === 'string',
  )
  if (!first) return null
  const snapshot = row.context_snapshot as { aggregate_stats?: { closed_trades?: unknown } } | null
  const closed = snapshot?.aggregate_stats?.closed_trades
  return { text: first.text, closedTrades: typeof closed === 'number' ? closed : null }
}

// «Qué revisar»: el patrón más reciente que generó la IA a partir de los trades
// cerrados (no calcula nada: lee la última tanda guardada). Sin insight guardado,
// estado vacío honesto en vez de rellenar con texto genérico.
export function ReviewInsightCard({ userId }: { userId: string }) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getLatestInsights(userId)
      .then((row) => {
        if (!cancelled) setState({ status: 'ready', insight: readInsight(row) })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (state.status === 'loading') {
    return <div className="h-24 animate-pulse rounded-xl bg-panel-2" aria-hidden="true" />
  }

  if (state.status === 'error' || !state.insight) {
    return (
      <Card tone="dashed" as="section" className="px-4 py-3.5 sm:p-4">
        <p className="label-mono">Qué revisar</p>
        <p className="mt-1.5 font-body text-[14px] leading-relaxed text-text-faint">
          Aún no hay un patrón guardado. Aparecen cuando tengas trades cerrados suficientes.
        </p>
        <p className="num mt-2 text-[11px] text-text-faint">Datos insuficientes todavía</p>
      </Card>
    )
  }

  const { text, closedTrades } = state.insight
  return (
    <Card tone="spark" as="section" className="px-3.5 py-3 sm:p-4">
      <div className="flex items-start gap-2.5">
        <Sparkles className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="label-mono text-on-spark/70">
            Qué revisar{closedTrades != null ? ` · ${closedTrades} trades` : ''}
          </p>
          <p className="mt-1 font-body text-[14px] font-semibold leading-snug sm:text-[15px]">{text}</p>
          <Link to="/insights" className="mt-2 hidden font-body text-[13px] font-bold underline lg:inline-block">
            Ver todos los insights →
          </Link>
        </div>
      </div>
    </Card>
  )
}
