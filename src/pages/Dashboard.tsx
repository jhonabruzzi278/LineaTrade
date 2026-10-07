import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { MetricCard } from '../components/MetricCard'
import { Segmented } from '../components/ui/segmented'
import { Tag } from '../components/ui/tag'
import { TradeListRow } from '../components/trade/TradeListRow'
import { InsightsSection } from '../components/InsightsSection'
import { GrowthGraphIcon, PercentageIcon, RatioIcon, TradeCountIcon } from '../components/icons/TradeIcons'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { formatNumber, formatPercent, formatSigned, signedTone } from '../lib/tradeDisplay'
import { cn } from '@/lib/utils'
import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type TradeStats = Database['public']['Views']['v_user_trade_stats']['Row'] & { open_trades?: number }
type Period = '7d' | '30d' | 'all'
type CurveTrade = { traded_at: string; pnl_r: number | null }

const RECENT_TRADES_LIMIT = 4
const OPEN_TRADES_LIMIT = 3
const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'Todo' },
] as const

function greeting(hour: number): string {
  if (hour < 12) return 'Buen día'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

function dateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

function periodStart(period: Period): Date | null {
  if (period === 'all') return null
  const date = new Date()
  date.setDate(date.getDate() - (period === '7d' ? 7 : 30))
  return date
}

function curvePoints(rows: CurveTrade[]): { points: string; total: number } | null {
  const validRows = rows.filter((row): row is { traded_at: string; pnl_r: number } => row.pnl_r != null)
  if (validRows.length === 0) return null

  let total = 0
  const values = validRows.map((row) => {
    total += row.pnl_r
    return total
  })
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const span = max - min || 1
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 160 : 8 + (index / (values.length - 1)) * 304
    const y = 92 - ((value - min) / span) * 76
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return { points, total }
}

function formatR(value: number): string {
  const rounded = value.toFixed(2)
  return `${value > 0 ? '+' : ''}${rounded}R`
}

export default function Dashboard() {
  const { user } = useAuth()
  const [recentTrades, setRecentTrades] = useState<TradeRow[]>([])
  const [openTrades, setOpenTrades] = useState<TradeRow[]>([])
  const [curveTrades, setCurveTrades] = useState<CurveTrade[]>([])
  const [stats, setStats] = useState<TradeStats | null>(null)
  const [period, setPeriod] = useState<Period>('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const userId = user.id
    let cancelled = false

    async function load() {
      const [tradesRes, openRes, statsRes, curveRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .eq('user_id', userId)
          .eq('is_backtest', false)
          .order('traded_at', { ascending: false })
          .limit(RECENT_TRADES_LIMIT),
        supabase
          .from('trades')
          .select('*, instruments(symbol, market)')
          .eq('user_id', userId)
          .eq('is_backtest', false)
          .eq('status', 'open')
          .order('traded_at', { ascending: false })
          .limit(OPEN_TRADES_LIMIT),
        supabase.from('v_user_trade_stats').select('*').eq('user_id', userId).maybeSingle(),
        supabase
          .from('trades')
          .select('traded_at, pnl_r')
          .eq('user_id', userId)
          .eq('is_backtest', false)
          .eq('status', 'closed')
          .order('traded_at', { ascending: true })
          .limit(500),
      ])
      if (cancelled) return

      const firstError = tradesRes.error ?? openRes.error ?? statsRes.error ?? curveRes.error
      if (firstError) {
        setError(getErrorMessage(firstError))
      } else {
        setRecentTrades((tradesRes.data as TradeRow[] | null) ?? [])
        setOpenTrades((openRes.data as TradeRow[] | null) ?? [])
        setStats(statsRes.data ?? null)
        setCurveTrades((curveRes.data as CurveTrade[] | null) ?? [])
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const filteredCurveTrades = useMemo(() => {
    const start = periodStart(period)
    if (!start) return curveTrades
    return curveTrades.filter((trade) => new Date(trade.traded_at) >= start)
  }, [curveTrades, period])
  const curve = useMemo(() => curvePoints(filteredCurveTrades), [filteredCurveTrades])
  const missingRCount = filteredCurveTrades.filter((trade) => trade.pnl_r == null).length
  const today = new Date()

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-mono">{dateLabel(today)}</p>
          <h1 className="mt-2 text-balance font-display text-[28px] leading-tight text-text-primary sm:text-[34px]">
            {greeting(today.getHours())}, así va tu proceso
          </h1>
          <p className="mt-2 font-body text-[14px] text-text-faint">Un registro claro para revisar tus decisiones con contexto.</p>
        </div>
        <Button asChild variant="cta" size="lg" className="hidden sm:inline-flex">
          <Link to="/nuevo-trade"><Plus className="h-4 w-4" aria-hidden="true" />Registrar trade</Link>
        </Button>
      </header>

      {error && <p role="alert" className="mb-5 rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 font-body text-[14px] text-loss">{error}</p>}
      {loading && <p className="font-body text-[14px] text-text-faint">Cargando tu actividad…</p>}

      {!loading && !error && (
        <>
          <section aria-label="Métricas de la bitácora" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Win rate" value={formatPercent(stats?.win_rate)} icon={<PercentageIcon className="h-4 w-4" />} hint={`${stats?.closed_trades ?? 0} trades cerrados`} />
            <MetricCard label="Profit factor" value={formatNumber(stats?.profit_factor)} icon={<GrowthGraphIcon className="h-4 w-4" />} hint="ganancia / pérdida bruta" />
            <MetricCard label="R promedio" value={formatSigned(stats?.avg_r)} icon={<RatioIcon className="h-4 w-4" />} tone={signedTone(stats?.avg_r)} hint="por trade cerrado" />
            <MetricCard label="Trades" value={String(stats?.total_trades ?? 0)} icon={<TradeCountIcon className="h-4 w-4" />} hint={`${openTrades.length} ${openTrades.length === 1 ? 'abierto' : 'abiertos'} ahora`} />
          </section>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)] lg:gap-6">
            <div className="min-w-0 space-y-5">
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="label-mono">R acumulada</p>
                    <p className={cn('num mt-2 text-[32px] font-semibold leading-none', curve && curve.total >= 0 ? 'text-gain' : curve ? 'text-loss' : 'text-text-faint')}>
                      {curve ? formatR(curve.total) : '—'}
                    </p>
                    <p className="mt-2 font-body text-[12px] text-text-faint">
                      {filteredCurveTrades.length} trades cerrados en el periodo
                      {missingRCount > 0 ? ` · ${missingRCount} sin R calculable` : ''}
                    </p>
                  </div>
                  <Segmented
                    label="Periodo de la curva de R"
                    options={PERIOD_OPTIONS}
                    value={period}
                    onChange={setPeriod}
                    className="w-[180px] shrink-0"
                  />
                </div>
                {curve ? (
                  <div className="mt-5 rounded-lg bg-panel-2 px-2 py-3">
                    <svg className="h-[112px] w-full overflow-visible" viewBox="0 0 320 100" role="img" aria-label={`Curva acumulada: ${formatR(curve.total)}`} preserveAspectRatio="none">
                      <line x1="0" x2="320" y1="54" y2="54" stroke="var(--color-hairline)" strokeDasharray="3 5" />
                      <polyline points={curve.points} fill="none" stroke="var(--color-signal)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-[112px] items-center justify-center rounded-lg border border-dashed border-hairline px-5 text-center">
                    <p className="font-body text-[13px] text-text-faint">La curva aparecerá cuando cierres trades con un stop definido.</p>
                  </div>
                )}
              </Card>

              <section aria-labelledby="recent-trades-heading">
                <div className="mb-3 flex items-center justify-between gap-4">
                  <div>
                    <p className="label-mono">Journal</p>
                    <h2 id="recent-trades-heading" className="mt-1 font-display text-[19px] text-text-primary">Actividad reciente</h2>
                  </div>
                  <Link to="/historial" className="inline-flex min-h-11 items-center gap-1 font-body text-[13px] font-semibold text-steel hover:text-text-primary">
                    Abrir journal <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
                {recentTrades.length === 0 ? (
                  <Card tone="dashed" className="py-6">
                    <p className="font-display text-[17px] text-text-primary">Aún no tienes trades registrados</p>
                    <p className="mt-1 font-body text-[13px] text-text-faint">Aquí verás tus últimas operaciones con su resultado y contexto.</p>
                    <Button asChild variant="outline" className="mt-4"><Link to="/nuevo-trade"><Plus className="h-4 w-4" aria-hidden="true" />Registrar el primero</Link></Button>
                  </Card>
                ) : (
                  <Card as="section" className="divide-y divide-hairline overflow-hidden p-0" aria-label="Trades recientes">
                    {recentTrades.map((trade, index) => <TradeListRow key={trade.id} trade={trade} index={index} showDate />)}
                  </Card>
                )}
                <Link to="/reporte" className="mt-3 flex min-h-11 items-center justify-between rounded-lg px-3 font-body text-[13px] text-text-faint transition-colors hover:bg-panel hover:text-text-primary">
                  <span>Ver reporte y curva de capital</span><ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </section>
            </div>

            <aside className="min-w-0 space-y-5">
              <Card as="section" aria-labelledby="open-trades-heading">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="label-mono">Seguimiento</p>
                    <h2 id="open-trades-heading" className="mt-1 font-display text-[18px] text-text-primary">Abierto ahora</h2>
                  </div>
                  <Tag tone="brand">{openTrades.length}</Tag>
                </div>
                {openTrades.length === 0 ? (
                  <p className="rounded-lg bg-panel-2 px-3 py-4 font-body text-[13px] text-text-faint">No tienes operaciones abiertas.</p>
                ) : (
                  <div className="divide-y divide-hairline">
                    {openTrades.map((trade) => (
                      <Link key={trade.id} to={`/trades/${trade.id}`} className="-mx-2 flex min-h-14 items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-panel-2">
                        <div className="min-w-0">
                          <p className="truncate font-display text-[15px] text-text-primary">{trade.instruments?.symbol ?? 'Trade'}</p>
                          <p className="mt-1 font-mono text-[11px] text-text-faint">{trade.side === 'long' ? 'LONG' : 'SHORT'} · entrada {trade.entry_price}</p>
                        </div>
                        <span className="num shrink-0 font-mono text-[12px] text-text-muted">{trade.stop_loss == null ? 'Sin stop' : `Stop ${trade.stop_loss}`}</span>
                      </Link>
                    ))}
                  </div>
                )}
                <Link to="/historial?status=open" className="mt-3 inline-flex min-h-11 items-center gap-1 font-body text-[12px] font-semibold text-steel hover:text-text-primary">
                  Ver operaciones abiertas <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Card>

              <InsightsSection compact />

              {stats && (stats.total_trades ?? 0) > 0 && stats.closed_trades === 0 && (
                <Card className="flex gap-3 border-spark/30 bg-spark/10">
                  <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-spark" aria-hidden="true" />
                  <p className="font-body text-[12px] leading-relaxed text-text-muted">Las métricas de resultado se calculan cuando cierras trades.</p>
                </Card>
              )}
            </aside>
          </div>
        </>
      )}

    </main>
  )
}
