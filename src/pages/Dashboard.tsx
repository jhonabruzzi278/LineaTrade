import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MetricCard } from '../components/MetricCard'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { formatTradeResult, tradeResultColorClass } from '../lib/tradeDisplay'
import type { Database } from '../types/database'

type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']
type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [statsRes, tradesRes] = await Promise.all([
        supabase.from('v_user_trade_stats').select('*').eq('user_id', user!.id).maybeSingle(),
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .order('traded_at', { ascending: false })
          .limit(5),
      ])
      if (cancelled) return
      if (statsRes.error) {
        setError(getErrorMessage(statsRes.error))
        setLoading(false)
        return
      }
      if (tradesRes.error) {
        setError(getErrorMessage(tradesRes.error))
        setLoading(false)
        return
      }
      setStats(statsRes.data)
      setRecentTrades((tradesRes.data as TradeRow[] | null) ?? [])
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="font-mono text-[13px] text-signal mb-2">tu bitácora</p>
        <h1 className="font-display text-[28px] text-text-primary mb-8">Dashboard</h1>

        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <MetricCard label="Win rate" value={formatPercent(stats?.win_rate)} />
          <MetricCard label="Profit factor" value={formatNumber(stats?.profit_factor)} />
          <MetricCard label="R promedio" value={formatSigned(stats?.avg_r)} />
          <MetricCard label="Trades" value={String(stats?.total_trades ?? 0)} />
        </div>

        {!loading && (stats?.total_trades ?? 0) > 0 && (stats?.closed_trades ?? 0) === 0 && (
          <p className="font-mono text-[12px] text-text-faint mb-8">
            win rate, profit factor y R promedio solo se calculan sobre trades cerrados —
            todavía no tienes ninguno.
          </p>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[18px] text-text-primary">Últimos trades</h2>
          <Link to="/historial" className="font-body text-[13px] text-signal hover:text-signal-dim transition-colors">
            Ver historial completo
          </Link>
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && recentTrades.length === 0 && (
          <div className="border border-hairline rounded-sm bg-panel px-6 py-10 text-center">
            <p className="font-body text-[15px] text-text-muted mb-4">
              Aún no tienes trades registrados.
            </p>
            <Link
              to="/nuevo-trade"
              className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
            >
              Registrar mi primer trade
            </Link>
          </div>
        )}

        {!loading && recentTrades.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden">
            {recentTrades.map((trade) => (
              <TradeRowItem key={trade.id} trade={trade} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function formatPercent(value: number | null | undefined): string {
  return value == null ? '—' : `${value}%`
}

function formatNumber(value: number | null | undefined): string {
  return value == null ? '—' : String(value)
}

function formatSigned(value: number | null | undefined): string {
  if (value == null) return '—'
  return value > 0 ? `+${value}` : String(value)
}

function TradeRowItem({ trade }: { trade: TradeRow }) {
  return (
    <Link
      to={`/trades/${trade.id}`}
      className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-panel-2 transition-colors"
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-[13px] text-text-primary">
          {trade.instruments?.symbol ?? '—'}
        </span>
        <span
          className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border ${
            trade.side === 'long'
              ? 'border-signal/40 text-signal'
              : 'border-steel/40 text-steel'
          }`}
        >
          {trade.side === 'long' ? 'long' : 'short'}
        </span>
        <span className="font-mono text-[11px] text-text-faint">{trade.status}</span>
      </div>
      <span className={`font-mono text-[13px] ${tradeResultColorClass(trade)}`}>
        {formatTradeResult(trade)}
      </span>
    </Link>
  )
}
