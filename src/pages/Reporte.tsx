import { useEffect, useState } from 'react'
import { Clock, Flame, TrendingDown } from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { MetricCard } from '../components/MetricCard'
import { CompareCard, EmptyCompareCard } from '../components/report/CompareCard'
import { EquityCurveChart } from '../components/report/EquityCurveChart'
import { GrowthGraphIcon, PercentageIcon, RatioIcon } from '../components/icons/TradeIcons'
import { useAuth } from '../lib/auth'
import { useSidebar } from '../lib/sidebar'
import { getClosedRealTrades, computeReportStats, type ReportStats, type BucketStat } from '../lib/reportStats'
import { getErrorMessage } from '../lib/errors'
import { formatPercent, formatSigned, signedTone } from '../lib/tradeDisplay'
import { cn } from '@/lib/utils'

function formatDuration(minutes: number | null): string {
  if (minutes == null) return '—'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const rest = Math.round(minutes % 60)
  return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`
}

function formatStreak(value: number | null): string {
  return value == null ? '—' : `${value} seguidas`
}

function bucketCard(title: string, stat: BucketStat | null, emptyReason: string) {
  if (!stat) return <EmptyCompareCard title={title} reason={emptyReason} />
  return (
    <CompareCard
      title={title}
      valueLabel={formatSigned(Math.round(stat.netPnl * 100) / 100)}
      valueTone={stat.netPnl >= 0 ? 'gain' : 'loss'}
      subLabel={`${stat.label} · WR ${formatPercent(Math.round(stat.winRate))} · ${stat.totalTrades} op.`}
    />
  )
}

export default function Reporte() {
  const { user } = useAuth()
  const { expanded } = useSidebar()
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setLoading(true)
    getClosedRealTrades(user.id)
      .then((rows) => {
        if (cancelled) return
        setStats(computeReportStats(rows))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className={cn(
          'max-w-5xl mx-auto px-6 py-10 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
        <div className="mb-8">
          <p className="font-mono text-[13px] text-signal mb-2">estadísticas avanzadas</p>
          <h1 className="font-display text-[28px] text-text-primary">Reporte</h1>
        </div>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}
        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && stats && stats.totalClosed === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted">
              Todavía no hay trades cerrados para calcular estadísticas.
            </p>
          </div>
        )}

        {!loading && stats && stats.totalClosed > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <MetricCard
                label="Win rate"
                value={formatPercent(stats.winRate != null ? Math.round(stats.winRate) : null)}
                icon={<PercentageIcon className="w-4 h-4" />}
              />
              <MetricCard
                label="Expected value"
                value={formatSigned(stats.expectedValue != null ? Math.round(stats.expectedValue * 100) / 100 : null)}
                icon={<GrowthGraphIcon className="w-4 h-4" />}
                tone={signedTone(stats.expectedValue)}
              />
              <MetricCard
                label="Mejor racha (ganadoras)"
                value={formatStreak(stats.bestWinStreak)}
                icon={<Flame className="w-4 h-4" />}
                tone="gain"
              />
              <MetricCard
                label="Peor racha (perdedoras)"
                value={formatStreak(stats.worstLossStreak)}
                icon={<TrendingDown className="w-4 h-4" />}
                tone="loss"
              />
              <MetricCard
                label="R promedio (ganadoras)"
                value={stats.avgWinningRR != null ? formatSigned(Math.round(stats.avgWinningRR * 100) / 100) : '—'}
                icon={<RatioIcon className="w-4 h-4" />}
              />
              <MetricCard
                label="Duración promedio"
                value={formatDuration(stats.avgDurationMinutes)}
                icon={<Clock className="w-4 h-4" />}
              />
            </div>
            <p className="font-mono text-[12px] text-text-faint mb-8">
              {stats.wins} ganadoras / {stats.losses} perdedoras · {stats.totalClosed} operaciones cerradas
            </p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
              {bucketCard('Mejor día', stats.bestDay, 'Sin datos suficientes')}
              {bucketCard('Peor día', stats.worstDay, 'Sin datos suficientes')}
              {bucketCard('Mejor semana', stats.bestWeek, 'Sin datos suficientes')}
              {bucketCard('Peor semana', stats.worstWeek, 'Sin datos suficientes')}
              {bucketCard('Mejor modelo', stats.bestStrategy, 'Asigná una estrategia en Nuevo Trade')}
              {bucketCard('Peor modelo', stats.worstStrategy, 'Asigná una estrategia en Nuevo Trade')}
              <CompareCard
                title="Promedio ganancia"
                valueLabel={stats.avgWin != null ? formatSigned(Math.round(stats.avgWin * 100) / 100) : '—'}
                valueTone="gain"
                subLabel={`${stats.wins} operaciones`}
              />
              <CompareCard
                title="Promedio pérdida"
                valueLabel={stats.avgLoss != null ? formatSigned(Math.round(stats.avgLoss * 100) / 100) : '—'}
                valueTone="loss"
                subLabel={`${stats.losses} operaciones`}
              />
              {stats.maxDrawdown != null ? (
                <CompareCard
                  title="Drawdown máx. (curva de capital)"
                  valueLabel={`-${Math.round(stats.maxDrawdown * 100) / 100}`}
                  valueTone="loss"
                  subLabel={stats.maxDrawdownPct != null ? `${Math.round(stats.maxDrawdownPct)}% desde el pico` : 'Pico-a-valle'}
                />
              ) : (
                <EmptyCompareCard title="Drawdown máx." reason="Sin datos suficientes" />
              )}
            </div>

            <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel shadow-card px-5 py-5">
              <h2 className="font-display text-[16px] text-text-primary mb-1">Curva de capital</h2>
              <p className="font-mono text-[11px] text-text-faint mb-4">
                P&amp;L acumulado por operación cerrada, en orden cronológico
              </p>
              <EquityCurveChart points={stats.equityCurve} />
            </div>
          </>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
