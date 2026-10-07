import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { Segmented } from '../components/ui/segmented'
import { EquityCurveChart } from '../components/report/EquityCurveChart'
import { ReportStat } from '../components/report/ReportStat'
import { useAuth } from '../lib/auth'
import { getErrorMessage } from '../lib/errors'
import {
  computeReportStats,
  filterByPeriod,
  getClosedRealTrades,
  type BucketStat,
  type ClosedTradeRow,
  type ReportPeriod,
} from '../lib/reportStats'
import {
  formatDrawdown,
  formatDuration,
  formatR,
  formatSignedDecimal,
  formatUnsignedDecimal,
  tradeCountLabel,
} from '../lib/reportFormat'
import { cn } from '@/lib/utils'

const PERIOD_OPTIONS: { value: ReportPeriod; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'Todo' },
]

// Debajo de 20 trades cerrados el backend ya trata la muestra como «limitada»
// (calculateDataSufficiency); el reporte lo dice igual de claro.
const LIMITED_SAMPLE_THRESHOLD = 20

type Tone = 'default' | 'gain' | 'loss'

function toneOf(value: number | null): Tone {
  if (value == null || value === 0) return 'default'
  return value > 0 ? 'gain' : 'loss'
}

function bucketValue(stat: BucketStat | null): string | null {
  if (!stat) return null
  return stat.unit === 'r' ? formatR(stat.value) : formatSignedDecimal(stat.value)
}

function bucketHint(stat: BucketStat | null, emptyHint: string, withCount: boolean): string {
  if (!stat) return emptyHint
  return withCount ? `${bucketValue(stat)} · ${tradeCountLabel(stat.totalTrades)}` : `${bucketValue(stat)}`
}

interface CompareItem {
  key: string
  label: string
  name: string | null
  stat: BucketStat | null
  emptyHint: string
  withCount: boolean
}

function ReportSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando reporte">
      <div className="h-64 animate-pulse rounded-xl border border-hairline bg-panel" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-6 lg:gap-3.5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[84px] animate-pulse rounded-xl border border-hairline bg-panel" />
        ))}
      </div>
    </div>
  )
}

export default function Reporte() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ClosedTradeRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [period, setPeriod] = useState<ReportPeriod>('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setError(null)
    setRows(null)
    getClosedRealTrades(user.id)
      .then((result) => {
        if (!cancelled) setRows(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [user, reloadKey])

  const periodRows = useMemo(() => (rows ? filterByPeriod(rows, period) : []), [rows, period])
  const stats = useMemo(() => computeReportStats(periodRows), [periodRows])

  const loading = rows === null && error === null
  const hasAnyTrades = rows !== null && rows.length > 0

  const compare: CompareItem[] = [
    { key: 'best-day', label: 'Mejor día', name: stats.bestDay?.label ?? null, stat: stats.bestDay, emptyHint: 'Aún sin días para comparar', withCount: true },
    { key: 'worst-day', label: 'Peor día', name: stats.worstDay?.label ?? null, stat: stats.worstDay, emptyHint: 'Aún sin días para comparar', withCount: true },
    { key: 'best-week', label: 'Mejor semana', name: stats.bestWeek?.label ?? null, stat: stats.bestWeek, emptyHint: 'Aún sin semanas para comparar', withCount: false },
    { key: 'worst-week', label: 'Peor semana', name: stats.worstWeek?.label ?? null, stat: stats.worstWeek, emptyHint: 'Aún sin semanas para comparar', withCount: false },
    { key: 'best-model', label: 'Mejor modelo', name: stats.bestStrategy?.label ?? null, stat: stats.bestStrategy, emptyHint: 'Asigna una estrategia en Nuevo trade', withCount: false },
    { key: 'worst-model', label: 'Peor modelo', name: stats.worstStrategy?.label ?? null, stat: stats.worstStrategy, emptyHint: 'Asigna una estrategia en Nuevo trade', withCount: false },
  ]

  const periodNote = period === 'all' ? 'todo el historial' : period === '7d' ? 'últimos 7 días' : 'últimos 30 días'

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <PageHeader
        kicker="estadísticas avanzadas"
        title="Reporte"
        lead={hasAnyTrades ? `${tradeCountLabel(stats.totalClosed)} cerrados · ${periodNote} · sin contar práctica` : undefined}
        actions={
          hasAnyTrades ? (
            <Segmented options={PERIOD_OPTIONS} value={period} onChange={setPeriod} label="Periodo" className="w-full sm:w-56" />
          ) : undefined
        }
      />

      {loading && <ReportSkeleton />}

      {error && (
        <Card className="border-loss/40 text-center" role="alert">
          <p className="font-body text-[14px] text-loss">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => setReloadKey((key) => key + 1)}>
            Reintentar
          </Button>
        </Card>
      )}

      {rows !== null && rows.length === 0 && (
        <Card tone="dashed" className="px-6 py-12 text-center">
          <h2 className="font-display text-[19px] text-text-primary">Aún no hay trades cerrados</h2>
          <p className="mx-auto mt-2 max-w-md font-body text-[14px] leading-relaxed text-text-faint">
            El reporte se calcula con tus operaciones cerradas reales. Las de práctica no cuentan. Registra y cierra tu primer trade para empezar.
          </p>
          <Button asChild variant="cta" size="lg" className="mt-6">
            <Link to="/nuevo-trade">Registrar un trade</Link>
          </Button>
        </Card>
      )}

      {hasAnyTrades && stats.totalClosed === 0 && (
        <Card tone="dashed" className="px-6 py-10 text-center">
          <p className="font-body text-[14px] text-text-faint">No hay trades cerrados en {periodNote}. Prueba con un periodo más amplio.</p>
        </Card>
      )}

      {hasAnyTrades && stats.totalClosed > 0 && (
        <div className="space-y-4 lg:space-y-5">
          {stats.totalClosed < LIMITED_SAMPLE_THRESHOLD && (
            <Callout tone="warning">
              Con {tradeCountLabel(stats.totalClosed)} cerrados la muestra es pequeña: estas cifras pueden cambiar mucho con cada operación. Léelas como referencia, no como conclusión.
            </Callout>
          )}

          <Card as="section" aria-labelledby="equity-title" className="px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h2 id="equity-title" className="font-display text-[15px] text-text-primary sm:text-[17px]">
                  Curva de capital
                </h2>
                <p className="mt-1 hidden font-body text-[13px] text-text-faint sm:block">
                  P&amp;L acumulado por operación cerrada, en orden cronológico
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="label-mono">Acumulado</p>
                <p
                  className={cn(
                    'font-display mt-1 text-[26px] leading-none sm:text-[30px]',
                    toneOf(stats.totalPnl) === 'gain' ? 'text-gain' : toneOf(stats.totalPnl) === 'loss' ? 'text-loss' : 'text-text-primary',
                  )}
                >
                  {formatSignedDecimal(stats.totalPnl)}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <EquityCurveChart points={stats.equityCurve} />
            </div>
          </Card>

          <section aria-label="Resumen" className="grid grid-cols-2 gap-2.5 lg:grid-cols-6 lg:gap-3.5">
            <ReportStat label="Win rate" value={stats.winRate != null ? `${Math.round(stats.winRate)}%` : null} hint={`${stats.wins} de ${stats.totalClosed}`} />
            <ReportStat label="Expected value" value={formatSignedDecimal(stats.expectedValue)} tone={toneOf(stats.expectedValue)} hint="por operación" />
            <ReportStat label="Mejor racha" value={stats.bestWinStreak != null ? String(stats.bestWinStreak) : null} hint="ganadoras seguidas" />
            <ReportStat label="Peor racha" value={stats.worstLossStreak != null ? String(stats.worstLossStreak) : null} hint="perdedoras seguidas" />
            <ReportStat label="R prom. ganadoras" value={formatUnsignedDecimal(stats.avgWinningRR)} />
            <ReportStat label="Duración prom." value={formatDuration(stats.avgDurationMinutes)} kind="compact" />
          </section>

          {/* Escritorio: rejilla de tarjetas. */}
          <section aria-label="Mejores y peores momentos" className="hidden gap-3.5 lg:grid lg:grid-cols-4">
            {compare.map((item) => (
              <ReportStat
                key={item.key}
                label={item.label}
                value={item.name}
                kind="text"
                tone={item.stat ? toneOf(item.stat.value) : 'default'}
                hint={bucketHint(item.stat, item.emptyHint, item.withCount)}
              />
            ))}
            <ReportStat label="Promedio ganancia" value={formatSignedDecimal(stats.avgWin)} tone={stats.avgWin != null ? 'gain' : 'default'} hint={`${stats.wins} ganadoras`} />
            <ReportStat label="Promedio pérdida" value={formatSignedDecimal(stats.avgLoss)} tone={stats.avgLoss != null ? 'loss' : 'default'} hint={`${stats.losses} perdedoras`} />
          </section>

          {/* Móvil: lista compacta. */}
          <section aria-label="Mejores y peores momentos" className="space-y-2.5 lg:hidden">
            <Card className="px-3.5 py-1 sm:px-4">
              <dl>
                {compare.map((item, index) => (
                  <div key={item.key} className={cn('flex min-h-[52px] items-center justify-between gap-3 py-2', index > 0 && 'border-t border-hairline')}>
                    <div className="min-w-0">
                      <dt className="label-mono">{item.label}</dt>
                      <dd className={cn('mt-0.5 truncate font-body text-[15px] font-bold', item.name ? 'text-text-primary' : 'text-text-faint')}>
                        {item.name ?? item.emptyHint}
                      </dd>
                    </div>
                    {item.stat && (
                      <span className={cn('num shrink-0 text-right text-[13px]', toneOf(item.stat.value) === 'gain' ? 'text-gain' : toneOf(item.stat.value) === 'loss' ? 'text-loss' : 'text-text-primary')}>
                        {item.withCount ? bucketHint(item.stat, '', true) : bucketValue(item.stat)}
                      </span>
                    )}
                  </div>
                ))}
              </dl>
            </Card>
            <div className="grid grid-cols-2 gap-2.5">
              <ReportStat label="Prom. ganancia" value={formatSignedDecimal(stats.avgWin)} tone={stats.avgWin != null ? 'gain' : 'default'} />
              <ReportStat label="Prom. pérdida" value={formatSignedDecimal(stats.avgLoss)} tone={stats.avgLoss != null ? 'loss' : 'default'} />
            </div>
          </section>

          <Card as="section" aria-label="Drawdown máximo" className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-[22px]">
            <div>
              <p className="label-mono">Drawdown máximo</p>
              <p className={cn('num mt-1.5 text-[24px] sm:text-[26px]', stats.maxDrawdown ? 'text-loss' : 'text-text-primary')}>{formatDrawdown(stats.maxDrawdown)}</p>
            </div>
            <p className="min-w-[220px] flex-1 font-body text-[12px] leading-relaxed text-text-faint sm:text-[13px]">
              Peor caída de pico a valle de tu curva de capital
              {stats.maxDrawdownPct != null ? (
                <>
                  : <b className="num font-medium text-text-primary">{Math.round(stats.maxDrawdownPct)}%</b> desde el pico.
                </>
              ) : (
                '.'
              )}
            </p>
          </Card>
        </div>
      )}
    </main>
  )
}
