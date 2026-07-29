import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { MetricCard } from '../components/MetricCard'
import { InsightsSection } from '../components/InsightsSection'
import { TradeListRow } from '../components/trade/TradeListRow'
import { GrowthGraphIcon, PercentageIcon, RatioIcon, TradeCountIcon } from '../components/icons/TradeIcons'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { formatNumber, formatPercent, formatSigned, signedTone } from '../lib/tradeDisplay'
import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']

const RECENT_TRADES_LIMIT = 10

export default function Dashboard() {
  const { user } = useAuth()
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [tradesRes, statsRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .eq('is_backtest', false)
          .order('traded_at', { ascending: false })
          .limit(RECENT_TRADES_LIMIT),
        supabase.from('v_user_trade_stats').select('*').eq('user_id', user!.id).maybeSingle(),
      ])
      if (cancelled) return
      if (tradesRes.error) {
        setError(getErrorMessage(tradesRes.error))
        setLoading(false)
        return
      }
      setRecentTrades((tradesRes.data as TradeRow[] | null) ?? [])
      setStats(statsRes.data ?? null)
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
      <main className="max-w-5xl mx-auto px-6 py-10 pb-28">
        <div className="mb-8">
          <p className="font-mono text-[13px] text-signal mb-2">tu bitácora</p>
          <h1 className="font-display text-[28px] text-text-primary">Tus trades</h1>
        </div>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}

        {!loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <MetricCard
                label="Win rate"
                value={formatPercent(stats?.win_rate)}
                icon={<PercentageIcon className="w-4 h-4" />}
              />
              <MetricCard
                label="Profit factor"
                value={formatNumber(stats?.profit_factor)}
                icon={<GrowthGraphIcon className="w-4 h-4" />}
              />
              <MetricCard
                label="R promedio"
                value={formatSigned(stats?.avg_r)}
                icon={<RatioIcon className="w-4 h-4" />}
                tone={signedTone(stats?.avg_r)}
              />
              <MetricCard
                label="Trades"
                value={String(stats?.total_trades ?? 0)}
                icon={<TradeCountIcon className="w-4 h-4" />}
              />
            </div>
            {(stats?.total_trades ?? 0) > 0 && (stats?.closed_trades ?? 0) === 0 && (
              <p className="font-mono text-[12px] text-text-faint -mt-6 mb-8">
                win rate, profit factor y R promedio solo se calculan sobre trades cerrados.
              </p>
            )}
          </>
        )}

        {!loading && <InsightsSection />}

        <Link
          to="/ia-trader"
          className="group flex items-center justify-between gap-4 mb-8 px-5 py-4 rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel shadow-card transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5"
        >
          <div>
            <p className="font-mono text-[11px] text-signal tracking-wide mb-1">test de perfil</p>
            <p className="font-body text-[14px] text-text-primary">Convierte la IA en tu trader</p>
          </div>
          <span className="font-mono text-[13px] text-text-faint shrink-0 transition-all duration-200 group-hover:text-signal group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          to="/backtesting"
          className="group flex items-center justify-between gap-4 mb-8 px-5 py-4 rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel shadow-card transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5"
        >
          <div>
            <p className="font-mono text-[11px] text-signal tracking-wide mb-1">market replay</p>
            <p className="font-body text-[14px] text-text-primary">Analiza tus estrategias con backtesting</p>
          </div>
          <span className="font-mono text-[13px] text-text-faint shrink-0 transition-all duration-200 group-hover:text-signal group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          to="/escaner"
          className="group flex items-center justify-between gap-4 mb-8 px-5 py-4 rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel shadow-card transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5"
        >
          <div>
            <p className="font-mono text-[11px] text-signal tracking-wide mb-1">market scanner</p>
            <p className="font-body text-[14px] text-text-primary">Filtrá el mercado cripto por RSI, volumen y más</p>
          </div>
          <span className="font-mono text-[13px] text-text-faint shrink-0 transition-all duration-200 group-hover:text-signal group-hover:translate-x-1">
            →
          </span>
        </Link>

        <Link
          to="/coach"
          className="group flex items-center justify-between gap-4 mb-8 px-5 py-4 rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel shadow-card transition-all duration-200 hover:border-signal/30 hover:-translate-y-0.5"
        >
          <div>
            <p className="font-mono text-[11px] text-signal tracking-wide mb-1">coach de trading</p>
            <p className="font-body text-[14px] text-text-primary">Conversá con la IA sobre tus propios patrones</p>
          </div>
          <span className="font-mono text-[13px] text-text-faint shrink-0 transition-all duration-200 group-hover:text-signal group-hover:translate-x-1">
            →
          </span>
        </Link>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-[18px] text-text-primary">Últimos trades</h2>
          <Link to="/historial" className="font-body text-[13px] text-signal hover:text-signal-dim transition-colors">
            Ver historial completo
          </Link>
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && recentTrades.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted mb-4">
              Aún no tienes trades registrados.
            </p>
            <Link
              to="/nuevo-trade"
              className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
            >
              Registrar mi primer trade
            </Link>
          </div>
        )}

        {!loading && recentTrades.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
            {recentTrades.map((trade, index) => (
              <TradeListRow key={trade.id} trade={trade} index={index} />
            ))}
          </div>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
