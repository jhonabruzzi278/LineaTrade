import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NotebookPen, Plus, RefreshCw, TriangleAlert } from 'lucide-react'
import { Avatar } from '../components/Avatar'
import { MetricCard } from '../components/MetricCard'
import { AcademyCard } from '../components/home/AcademyCard'
import { OpenTradeCard } from '../components/home/OpenTradeCard'
import { RCurveCard } from '../components/home/RCurveCard'
import { ReviewInsightCard } from '../components/home/ReviewInsightCard'
import { TradeListRow, TradeTableHeader, type TradeListItem } from '../components/trade/TradeListRow'
import { Button, buttonVariants } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Segmented } from '../components/ui/segmented'
import { SparkButton } from '../components/ui/spark-button'
import { useAuth } from '../lib/auth'
import {
  computeDashboardStats,
  filterByPeriod,
  previousPeriodRows,
  type DashboardPeriod,
} from '../lib/dashboardStats'
import { getErrorMessage } from '../lib/errors'
import { getClosedRealTrades, type ClosedTradeRow } from '../lib/reportStats'
import { supabase } from '../lib/supabase'
import { formatSignedFixed } from '../lib/tradeRowDisplay'
import { cn } from '@/lib/utils'

const RECENT_TRADES_LIMIT = 5
const OPEN_TRADE_SELECT = '*, instruments(symbol, market), strategies(name)'

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'Todo' },
]
const PERIOD_LABEL: Record<DashboardPeriod, string> = { '7d': '7D', '30d': '30D', all: 'Todo' }

interface HomeData {
  recent: TradeListItem[]
  openTrades: TradeListItem[]
  openCount: number
  closedRows: ClosedTradeRow[]
}

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: HomeData }

function todayLabel(): string {
  return new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', '')
}

async function loadHome(userId: string): Promise<HomeData> {
  const [recentRes, openRes, closedRows] = await Promise.all([
    supabase
      .from('trades')
      .select(OPEN_TRADE_SELECT)
      .eq('is_backtest', false)
      .is('deleted_at', null)
      .order('traded_at', { ascending: false })
      .limit(RECENT_TRADES_LIMIT),
    supabase
      .from('trades')
      .select(OPEN_TRADE_SELECT, { count: 'exact' })
      .eq('is_backtest', false)
      .eq('status', 'open')
      .is('deleted_at', null)
      .order('traded_at', { ascending: false })
      .limit(1),
    getClosedRealTrades(userId),
  ])
  const failure = recentRes.error ?? openRes.error
  if (failure) throw failure
  const openTrades = (openRes.data as TradeListItem[] | null) ?? []
  return {
    recent: (recentRes.data as TradeListItem[] | null) ?? [],
    openTrades,
    openCount: openRes.count ?? openTrades.length,
    closedRows,
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [period, setPeriod] = useState<DashboardPeriod>('30d')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadHome(user.id)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data })
      })
      .catch((error: unknown) => {
        if (!cancelled) setState({ status: 'error', message: getErrorMessage(error) })
      })
    return () => {
      cancelled = true
    }
  }, [user, reloadKey])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }, [])

  const data = state.status === 'ready' ? state.data : null
  const stats = useMemo(() => (data ? computeDashboardStats(filterByPeriod(data.closedRows, period)) : null), [data, period])
  const deltaR = useMemo(() => {
    if (!data || period === 'all') return null
    const previous = computeDashboardStats(previousPeriodRows(data.closedRows, period))
    const current = computeDashboardStats(filterByPeriod(data.closedRows, period))
    if (previous.accumulatedR == null || current.accumulatedR == null) return null
    return Math.round((current.accumulatedR - previous.accumulatedR) * 10) / 10
  }, [data, period])

  const isEmpty = data != null && data.recent.length === 0
  const mobileTitle = isEmpty ? 'Bienvenido' : 'Tu semana'

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <header className="mb-5 flex items-end justify-between gap-4 lg:mb-6">
        <div className="min-w-0">
          <p className="label-mono">{todayLabel()}</p>
          <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary lg:text-[32px]">
            <span className="lg:hidden">{mobileTitle}</span>
            <span className="hidden lg:inline">Buen día, así va tu proceso</span>
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {data && !isEmpty && (
            <Segmented
              label="Periodo"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
              className="hidden w-44 lg:grid"
            />
          )}
          {data && !isEmpty && (
            <Link to="/nuevo-trade" className={cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'hidden lg:inline-flex')}>
              <Plus className="h-[17px] w-[17px]" strokeWidth={2.6} aria-hidden="true" />
              Registrar trade
            </Link>
          )}
          <span className="lg:hidden">
            <Avatar />
          </span>
        </div>
      </header>

      {state.status === 'loading' && <HomeSkeleton />}
      {state.status === 'error' && <HomeError message={state.message} onRetry={retry} />}

      {data && stats && isEmpty && <HomeEmpty userId={user?.id ?? ''} />}

      {data && stats && !isEmpty && (
        <div className="flex flex-col gap-4 lg:gap-5">
          <Segmented label="Periodo" options={PERIOD_OPTIONS} value={period} onChange={setPeriod} className="lg:hidden" />

          <section aria-label="Resumen del periodo" className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:gap-3.5">
            <RCurveCard
              periodLabel={PERIOD_LABEL[period]}
              accumulatedR={stats.accumulatedR}
              curve={stats.curve}
              deltaR={deltaR}
              rCount={stats.rCount}
            />
            <MetricsStrip stats={stats} />
            <div className="hidden lg:contents">
              <MetricCard label="Win rate" value={fmtPercent(stats.winRate)} hint={winRateHint(stats)} />
              <MetricCard
                label="Profit factor"
                value={stats.profitFactor == null ? '—' : String(stats.profitFactor)}
                hint={stats.profitFactor == null && stats.closedCount > 0 ? 'sin pérdidas en el periodo' : 'ganancia / pérdida bruta'}
              />
              <MetricCard
                label="R promedio"
                value={stats.avgR == null ? '—' : formatSignedFixed(stats.avgR)}
                tone={stats.avgR == null ? 'default' : stats.avgR >= 0 ? 'gain' : 'loss'}
                hint={stats.rCount > 0 && stats.rCount < stats.closedCount ? `sobre ${stats.rCount} con R` : 'por trade cerrado'}
              />
              <MetricCard label="Trades" value={String(stats.closedCount)} hint={openHint(data.openCount)} />
            </div>
          </section>

          <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
            <div className="order-2 min-w-0 lg:order-1">
              <Card as="section" className="overflow-hidden p-0 sm:p-0">
                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <h2 className="font-display text-[16px] text-text-primary lg:text-[17px]">
                    <span className="lg:hidden">Últimos trades</span>
                    <span className="hidden lg:inline">Actividad reciente</span>
                  </h2>
                  <Link to="/historial" className="inline-flex min-h-11 items-center font-body text-[13px] font-semibold text-steel">
                    <span className="lg:hidden">Journal →</span>
                    <span className="hidden lg:inline">Abrir journal →</span>
                  </Link>
                </div>
                <TradeTableHeader />
                <ul className="divide-y divide-hairline">
                  {data.recent.map((trade, index) => (
                    <li key={trade.id}>
                      <TradeListRow trade={trade} index={index} />
                    </li>
                  ))}
                </ul>
                <Link
                  to="/reporte"
                  className="group flex min-h-12 items-center justify-between gap-4 border-t border-hairline px-5 font-body text-[13px] text-text-faint hover:text-text-primary"
                >
                  Ver estadísticas y curva de capital
                  <span className="font-bold text-steel" aria-hidden="true">
                    →
                  </span>
                </Link>
              </Card>
            </div>

            <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:gap-3.5">
              {data.openTrades[0] && (
                <div className="hidden lg:block">
                  <OpenTradeCard trade={data.openTrades[0]} extraOpen={Math.max(0, data.openCount - 1)} />
                </div>
              )}
              {user && <ReviewInsightCard userId={user.id} />}
              {user && <AcademyCard userId={user.id} />}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function fmtPercent(value: number | null): string {
  return value == null ? '—' : `${value}%`
}

function winRateHint(stats: { wins: number; closedCount: number }): string {
  return stats.closedCount > 0 ? `${stats.wins} de ${stats.closedCount} cerrados` : 'sin trades cerrados'
}

function openHint(openCount: number): string {
  if (openCount === 0) return 'cerrados en el periodo'
  return `${openCount} abierto${openCount === 1 ? '' : 's'} ahora`
}

interface StripStats {
  winRate: number | null
  profitFactor: number | null
  avgR: number | null
  closedCount: number
}

// Móvil: las cuatro métricas en una sola tarjeta de cuatro columnas. En escritorio
// se reemplaza por tarjetas individuales con su línea de apoyo.
function MetricsStrip({ stats }: { stats: StripStats }) {
  const cells: { label: string; value: string; tone?: string }[] = [
    { label: 'Win rate', value: fmtPercent(stats.winRate) },
    { label: 'P. factor', value: stats.profitFactor == null ? '—' : String(stats.profitFactor) },
    {
      label: 'R prom.',
      value: stats.avgR == null ? '—' : formatSignedFixed(stats.avgR),
      tone: stats.avgR == null ? undefined : stats.avgR >= 0 ? 'text-gain' : 'text-loss',
    },
    { label: 'Trades', value: String(stats.closedCount) },
  ]
  return (
    <dl className="grid grid-cols-4 rounded-[10px] border border-hairline bg-panel lg:hidden" aria-label="Métricas del periodo">
      {cells.map((cell, i) => (
        <div key={cell.label} className={cn('py-2.5 pl-3', i > 0 && 'border-l border-hairline')}>
          <dt className="label-mono text-[9px]">{cell.label}</dt>
          <dd className={cn('num mt-1 text-[18px] font-medium', cell.tone ?? (cell.value === '—' ? 'text-text-faint' : 'text-text-primary'))}>
            {cell.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function HomeSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Cargando tu resumen" className="flex flex-col gap-4">
      <div className="h-[92px] animate-pulse rounded-xl bg-panel-2" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[62px] animate-pulse rounded-[10px] bg-panel-2" />
        ))}
      </div>
      <div className="h-[70px] animate-pulse rounded-[10px] bg-panel-2" />
      <div className="flex flex-col gap-2.5">
        <div className="h-[18px] w-2/5 animate-pulse rounded bg-panel-2" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[52px] animate-pulse rounded-[10px] bg-panel-2" />
        ))}
      </div>
      <span className="sr-only">Cargando tu resumen…</span>
    </div>
  )
}

function HomeError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mx-auto max-w-md pt-6 lg:pt-12">
      <Card role="alert" className="px-5 py-6 text-center">
        <div className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-full border border-loss/40 bg-loss/10 text-loss">
          <TriangleAlert className="h-[26px] w-[26px]" aria-hidden="true" />
        </div>
        <h2 className="font-display mt-4 text-[20px] text-text-primary">No pudimos cargar tu resumen</h2>
        <p className="mt-2 font-body text-[14px] leading-relaxed text-text-faint">
          Revisa tu conexión e intenta de nuevo. Tus trades están a salvo.
        </p>
        <p className="num mt-2 break-words text-[11px] text-text-faint/80">{message}</p>
        <Button variant="cta" size="lg" className="mt-5 w-full" onClick={onRetry}>
          <RefreshCw className="h-[17px] w-[17px]" aria-hidden="true" />
          Reintentar
        </Button>
      </Card>
      <p className="mt-4 text-center font-body text-[13px] text-text-faint">
        Mientras tanto puedes{' '}
        <Link to="/nuevo-trade" className="font-bold text-steel">
          registrar un trade
        </Link>
        .
      </p>
    </div>
  )
}

const FIRST_STEPS = [
  { title: 'Sube la captura de tu ticket', hint: 'La IA completa los datos.' },
  { title: 'Anota contexto y emoción' },
  { title: 'Ciérralo y mira tus métricas' },
]

function HomeEmpty({ userId }: { userId: string }) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <Card tone="brand" as="section" className="p-[18px] lg:flex lg:items-center lg:gap-6 lg:px-6 lg:py-[18px]">
        <div className="min-w-0 lg:flex-1">
          <p className="label-mono text-on-signal/80">Tu primer registro · 2 minutos</p>
          <h2 className="font-display mt-2 text-[25px] leading-[1.06] lg:text-[24px]">
            <span className="lg:hidden">Registra un trade y empieza a ver tus patrones.</span>
            <span className="hidden lg:inline">Registra tu primer trade y empieza a ver tus patrones.</span>
          </h2>
          <p className="mt-1.5 hidden font-body text-[14px] text-on-signal/85 lg:block">
            Sube la captura de tu ticket: la IA completa los datos y tú los confirmas.
          </p>
          <ol className="mt-3 lg:hidden">
            {FIRST_STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start gap-3 border-t border-on-signal/25 py-2.5">
                <span className="num flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-spark text-[12px] font-bold text-on-spark">
                  {i + 1}
                </span>
                <div>
                  <p className="font-body text-[14px] font-bold">{step.title}</p>
                  {step.hint && <p className="mt-0.5 font-body text-[13px] text-on-signal/85">{step.hint}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <SparkButton asChild className="mt-3 w-full lg:mt-0 lg:w-auto">
          <Link to="/nuevo-trade">
            <Plus className="h-[18px] w-[18px]" strokeWidth={2.8} aria-hidden="true" />
            <span className="lg:hidden">Registrar mi primer trade</span>
            <span className="hidden lg:inline">Registrar trade</span>
          </Link>
        </SparkButton>
      </Card>

      <section aria-label="Resumen del periodo" className="flex flex-col gap-2 lg:gap-3">
        <dl className="grid grid-cols-4 rounded-[10px] border border-hairline bg-panel lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))] lg:gap-3.5 lg:border-0 lg:bg-transparent">
          <EmptyCell label="R acum. · 30D" className="hidden lg:block" display />
          <EmptyCell label="Win rate" />
          <EmptyCell label="Profit factor" shortLabel="P. factor" />
          <EmptyCell label="R promedio" shortLabel="R prom." />
          <EmptyCell label="Trades" value="0" />
        </dl>
        <p className="num hidden text-[11px] text-text-faint lg:block">Las métricas se calculan sobre trades cerrados.</p>
      </section>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)] lg:items-start lg:gap-4">
        <Card as="section" className="order-2 hidden min-w-0 flex-col lg:order-1 lg:flex">
          <h2 className="font-display text-[17px] text-text-primary">Actividad reciente</h2>
          <div className="mt-2.5 flex flex-col items-center justify-center gap-1.5 rounded-[10px] border border-dashed border-input p-7 text-center">
            <NotebookPen className="h-[30px] w-[30px] text-text-faint" strokeWidth={1.6} aria-hidden="true" />
            <p className="font-body text-[15px] font-semibold text-text-primary">Aún no tienes trades registrados</p>
            <p className="font-body text-[13px] text-text-faint">Aquí verás tus últimas operaciones con su resultado en R.</p>
          </div>
        </Card>
        <div className="order-1 flex min-w-0 flex-col gap-4 lg:order-2 lg:gap-3.5">
          {userId && <AcademyCard userId={userId} />}
          <div className="hidden lg:block">{userId && <ReviewInsightCard userId={userId} />}</div>
        </div>
      </div>
    </div>
  )
}

function EmptyCell({
  label,
  value = '—',
  className,
  display = false,
  shortLabel,
}: {
  label: string
  value?: string
  className?: string
  display?: boolean
  shortLabel?: string
}) {
  const isDash = value === '—'
  return (
    <div
      className={cn(
        'border-l border-hairline py-2.5 pl-3 first:border-l-0 lg:rounded-xl lg:border lg:bg-panel lg:px-4 lg:py-3.5 lg:first:border',
        className,
      )}
    >
      <dt className="label-mono text-[9px] lg:text-[10px]">
        {shortLabel ? <span className="lg:hidden">{shortLabel}</span> : null}
        <span className={shortLabel ? 'hidden lg:inline' : undefined}>{label}</span>
      </dt>
      <dd
        className={cn(
          'mt-1 text-[18px] lg:mt-2 lg:text-[26px]',
          display ? 'font-display text-[30px] leading-none' : 'num font-medium',
          isDash ? 'text-text-faint' : 'text-text-primary',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
