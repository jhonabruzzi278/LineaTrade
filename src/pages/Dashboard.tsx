import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { MetricCard } from '../components/MetricCard'
import { InsightsSection } from '../components/InsightsSection'
import { TradeListRow } from '../components/trade/TradeListRow'
import { GrowthGraphIcon, PercentageIcon, RatioIcon, TradeCountIcon } from '../components/icons/TradeIcons'
import { useAuth } from '../lib/auth'
import { useSidebar } from '../lib/sidebar'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { formatNumber, formatPercent, formatSigned, signedTone } from '../lib/tradeDisplay'
import { cn } from '@/lib/utils'
import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row']

const RECENT_TRADES_LIMIT = 5
const OPEN_TRADES_LIMIT = 3

export default function Dashboard() {
  const { user } = useAuth()
  const { expanded } = useSidebar()
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([])
  const [openTrades, setOpenTrades] = useState<TradeRow[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      const [tradesRes, openRes, statsRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .eq('is_backtest', false)
          .order('traded_at', { ascending: false })
          .limit(RECENT_TRADES_LIMIT),
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .eq('is_backtest', false)
          .eq('status', 'open')
          .order('traded_at', { ascending: false })
          .limit(OPEN_TRADES_LIMIT),
        supabase.from('v_user_trade_stats').select('*').eq('user_id', user!.id).maybeSingle(),
      ])
      if (cancelled) return

      const firstError = tradesRes.error ?? openRes.error ?? statsRes.error
      if (firstError) {
        setError(getErrorMessage(firstError))
      } else {
        setRecentTrades((tradesRes.data as TradeRow[] | null) ?? [])
        setOpenTrades((openRes.data as TradeRow[] | null) ?? [])
        setStats(statsRes.data ?? null)
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className={cn(
          'max-w-6xl mx-auto px-6 py-8 sm:py-10 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
        <header className="flex items-end justify-between gap-5 mb-8 reveal-up">
          <div>
            <p className="font-mono text-[13px] text-signal mb-2">resumen</p>
            <h1 className="font-display text-[28px] text-text-primary">Tus trades</h1>
            <p className="font-body text-[13px] text-text-muted mt-1">Estado actual de tu bitácora.</p>
          </div>
          <Link
            to="/nuevo-trade"
            className="hidden sm:inline-flex items-center gap-2 shrink-0 rounded-sm bg-signal px-4 py-3 font-body text-[13px] font-medium text-ink transition-all hover:bg-signal-dim hover:-translate-y-0.5 hover:shadow-glow"
          >
            <Plus className="h-4 w-4" />
            Registrar trade
          </Link>
        </header>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}
        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && !error && (
          <>
            <section aria-label="Métricas principales" className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-9">
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
            </section>

            {(stats?.total_trades ?? 0) > 0 && (stats?.closed_trades ?? 0) === 0 && (
              <p className="font-mono text-[11px] text-text-faint -mt-6 mb-8">
                Win rate, profit factor y R promedio se calculan sobre trades cerrados.
              </p>
            )}

            <div className="grid lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] gap-9 lg:gap-12 items-start">
              <section className="order-2 lg:order-1 min-w-0">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h2 className="font-display text-[18px] text-text-primary">Actividad reciente</h2>
                  <Link to="/historial" className="font-body text-[12px] text-signal hover:text-signal-dim transition-colors">
                    Ver historial
                  </Link>
                </div>

                {recentTrades.length === 0 ? (
                  <div className="border-y border-hairline py-9">
                    <p className="font-body text-[14px] text-text-muted mb-4">Aún no tienes trades registrados.</p>
                    <Link to="/nuevo-trade" className="font-body text-[13px] text-signal hover:text-signal-dim">
                      Registrar el primero →
                    </Link>
                  </div>
                ) : (
                  <div className="border-y border-hairline divide-y divide-hairline overflow-hidden">
                    {recentTrades.map((trade, index) => (
                      <TradeListRow key={trade.id} trade={trade} index={index} />
                    ))}
                  </div>
                )}

                <Link
                  to="/reporte"
                  className="group mt-5 flex items-center justify-between gap-4 py-3 font-body text-[13px] text-text-muted hover:text-text-primary transition-colors"
                >
                  <span>Ver estadísticas y curva de capital</span>
                  <span className="font-mono text-text-faint transition-all group-hover:text-signal group-hover:translate-x-1">→</span>
                </Link>
              </section>

              <aside className="order-1 lg:order-2 space-y-7 min-w-0">
                <section>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-faint">seguimiento</p>
                      <h2 className="font-display text-[18px] text-text-primary mt-1">Trades abiertos</h2>
                    </div>
                    <span className="font-mono text-[12px] text-signal">{openTrades.length}</span>
                  </div>

                  {openTrades.length === 0 ? (
                    <p className="border-y border-hairline py-4 font-body text-[13px] text-text-faint">
                      No hay operaciones pendientes.
                    </p>
                  ) : (
                    <div className="border-y border-hairline divide-y divide-hairline overflow-hidden">
                      {openTrades.map((trade, index) => (
                        <TradeListRow key={trade.id} trade={trade} index={index} />
                      ))}
                    </div>
                  )}
                </section>

                <InsightsSection compact />
              </aside>
            </div>
          </>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
