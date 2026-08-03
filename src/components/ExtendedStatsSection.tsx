import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  getWeekdayStats,
  getHourStats,
  getInstrumentStats,
  getConfluenceSingleStats,
  getConfluenceComboStats,
  getPsychologyPctStats,
  MIN_SAMPLE_FOR_HEATMAP,
  type WeekdayStat,
  type HourStat,
  type InstrumentStat,
  type ConfluenceSingleStat,
  type ConfluenceComboStat,
  type PsychologyPctStat,
} from '../lib/extendedStats'
import { getErrorMessage } from '../lib/errors'
import { formatPercent } from '../lib/tradeDisplay'

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Etiquetas en español para cada % de v_user_psychology_stats — a diferencia
// de v_user_psychology_tag_stats (win rate/profit factor POR tag, ver
// PsychologyStatsCard.tsx), esta vista responde "¿qué tan seguido pasa esto?",
// no "¿cómo me fue cuando pasó?" — son preguntas distintas, ambas con valor.
const PSYCHOLOGY_PCT_LABELS: Array<{ key: keyof PsychologyPctStat; label: string }> = [
  { key: 'pct_disciplined', label: 'Siguió el plan' },
  { key: 'pct_fomo', label: 'FOMO' },
  { key: 'pct_impulsive', label: 'Entró por impulso' },
  { key: 'pct_hesitated', label: 'Dudó antes de entrar' },
  { key: 'pct_overconfidence', label: 'Exceso de confianza' },
  { key: 'pct_off_plan', label: 'Se salió del plan' },
  { key: 'pct_moved_stop', label: 'Movió el stop loss' },
  { key: 'pct_moved_tp', label: 'Movió el take profit' },
  { key: 'pct_closed_early', label: 'Cerró antes de tiempo' },
  { key: 'pct_overtraded', label: 'Overtrading' },
  { key: 'pct_revenge', label: 'Revenge trading' },
  { key: 'pct_distractions', label: 'Hubo distracciones' },
]

function winRateCellColor(winRate: number | null, totalTrades: number | null): string {
  if (winRate == null || totalTrades == null || totalTrades < MIN_SAMPLE_FOR_HEATMAP) return 'bg-panel-2 text-text-faint'
  if (winRate >= 65) return 'bg-gain/70 text-ink'
  if (winRate >= 55) return 'bg-gain/40 text-text-primary'
  if (winRate >= 45) return 'bg-signal/20 text-text-primary'
  if (winRate >= 35) return 'bg-loss/30 text-text-primary'
  return 'bg-loss/60 text-text-primary'
}

function cellContent(winRate: number | null, totalTrades: number | null): string {
  if (winRate == null || totalTrades == null || totalTrades < MIN_SAMPLE_FOR_HEATMAP) return '\u2014'
  return `${Math.round(winRate)}%`
}

export function ExtendedStatsSection() {
  const [expanded, setExpanded] = useState(false)
  const [weekdayStats, setWeekdayStats] = useState<WeekdayStat[] | null>(null)
  const [hourStats, setHourStats] = useState<HourStat[] | null>(null)
  const [instrumentStats, setInstrumentStats] = useState<InstrumentStat[] | null>(null)
  const [confluenceSingleStats, setConfluenceSingleStats] = useState<ConfluenceSingleStat[] | null>(null)
  const [confluenceComboStats, setConfluenceComboStats] = useState<ConfluenceComboStat[] | null>(null)
  const [psychologyPctStats, setPsychologyPctStats] = useState<PsychologyPctStat | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!expanded) return
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      getWeekdayStats().catch(() => [] as WeekdayStat[]),
      getHourStats().catch(() => [] as HourStat[]),
      getInstrumentStats().catch(() => [] as InstrumentStat[]),
      getConfluenceSingleStats().catch(() => [] as ConfluenceSingleStat[]),
      getConfluenceComboStats().catch(() => [] as ConfluenceComboStat[]),
      getPsychologyPctStats().catch(() => null),
    ])
      .then(([wd, hr, inst, cs, cc, psych]) => {
        if (cancelled) return
        setWeekdayStats(wd)
        setHourStats(hr)
        setInstrumentStats(inst)
        setConfluenceSingleStats(cs)
        setConfluenceComboStats(cc)
        setPsychologyPctStats(psych)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [expanded])

  const isEmpty =
    !loading &&
    (!weekdayStats?.length || weekdayStats.every((r) => (r.total_trades ?? 0) < MIN_SAMPLE_FOR_HEATMAP)) &&
    (!hourStats?.length || hourStats.every((r) => (r.total_trades ?? 0) < MIN_SAMPLE_FOR_HEATMAP)) &&
    !instrumentStats?.length &&
    !confluenceSingleStats?.length &&
    (!psychologyPctStats || (psychologyPctStats.total_trades ?? 0) < MIN_SAMPLE_FOR_HEATMAP)

  return (
    <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel shadow-card px-5 py-5 mb-8">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex items-center gap-2 w-full text-left mb-3 hover:text-text-primary transition-colors"
      >
        {expanded ? <ChevronDown size={16} className="text-signal" /> : <ChevronRight size={16} className="text-text-faint" />}
        <h2 className="font-display text-[18px] text-text-primary">Estadísticas avanzadas</h2>
      </button>

      {!expanded && (
        <p className="font-body text-[13px] text-text-faint ml-7">
          Heatmaps por día, hora, instrumento, confluencia y frecuencia de comportamientos. Requiere datos suficientes
          (mín. 3 trades cerrados por celda).
        </p>
      )}

      {expanded && loading && <p className="font-body text-[13px] text-text-muted ml-7">Cargando...</p>}
      {expanded && error && <p className="font-body text-[13px] text-loss ml-7 mb-4">{error}</p>}
      {expanded && isEmpty && (
        <p className="font-body text-[13px] text-text-faint ml-7">
          Todavía no hay suficientes trades cerrados como para mostrar estadísticas por dimensión.
        </p>
      )}

      {expanded && !loading && !isEmpty && (
        <div className="space-y-6 mt-4 ml-7">
          {/* Por día de semana */}
          {weekdayStats && weekdayStats.some((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP) && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">POR DÍA DE SEMANA</h3>
              <div className="grid grid-cols-7 gap-1.5 max-w-xl">
                {WEEKDAY_LABELS.map((label, i) => {
                  const row = weekdayStats.find((r) => r.weekday === i)
                  const wr = row?.win_rate ?? null
                  const tt = row?.total_trades ?? null
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <span className="font-mono text-[10px] text-text-faint">{label}</span>
                      <div
                        className={`w-full aspect-square rounded-sm flex items-center justify-center font-mono text-[12px] ${winRateCellColor(wr, tt)}`}
                        title={row ? `${row.total_trades} trades, avg R ${row.avg_r ?? '\u2014'}` : undefined}
                      >
                        {cellContent(wr, tt)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Por hora del día */}
          {hourStats && hourStats.some((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP) && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">POR HORA DEL DÍA (UTC)</h3>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-1 max-w-3xl">
                {hourStats.map((row, i) => {
                  const wr = row.win_rate
                  const tt = row.total_trades
                  const hour = row.hour_of_day ?? i
                  return (
                    <div
                      key={hour}
                      className="flex flex-col items-center gap-0.5"
                      title={`${row.total_trades} trades, avg R ${row.avg_r ?? '\u2014'}`}
                    >
                      <span className="font-mono text-[9px] text-text-faint">{String(hour).padStart(2, '0')}</span>
                      <div
                        className={`w-full aspect-[2/1] rounded-sm flex items-center justify-center font-mono text-[10px] ${winRateCellColor(wr, tt)}`}
                      >
                        {cellContent(wr, tt)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Por instrumento */}
          {instrumentStats && instrumentStats.length > 0 && instrumentStats.some((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP) && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">POR INSTRUMENTO (TOP 10)</h3>
              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full text-left font-mono text-[12px] max-w-xl">
                  <thead>
                    <tr className="text-text-faint border-b border-hairline">
                      <th className="font-normal pb-2 pr-4">Símbolo</th>
                      <th className="font-normal pb-2 px-2 text-right">Trades</th>
                      <th className="font-normal pb-2 px-2 text-right">Win rate</th>
                      <th className="font-normal pb-2 pl-2 text-right">Avg R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {instrumentStats.filter((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP).map((row) => (
                      <tr key={row.symbol} className="hover:bg-panel/50 transition-colors">
                        <td className="py-2 pr-4 text-text-primary">{row.symbol}</td>
                        <td className="py-2 px-2 text-right text-text-faint">{row.total_trades}</td>
                        <td className="py-2 px-2 text-right">{formatPercent(row.win_rate)}</td>
                        <td className="py-2 pl-2 text-right text-text-faint">{row.avg_r != null ? row.avg_r.toFixed(2) : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por confluencia simple */}
          {confluenceSingleStats && confluenceSingleStats.length > 0 && confluenceSingleStats.some((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP) && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">POR CONFLUENCIA (SINGLE)</h3>
              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full text-left font-mono text-[12px] max-w-xl">
                  <thead>
                    <tr className="text-text-faint border-b border-hairline">
                      <th className="font-normal pb-2 pr-4">Confluencia</th>
                      <th className="font-normal pb-2 px-2 text-right">Trades</th>
                      <th className="font-normal pb-2 px-2 text-right">Win rate</th>
                      <th className="font-normal pb-2 pl-2 text-right">Avg R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {confluenceSingleStats.filter((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP).map((row) => (
                      <tr key={row.confluence_name ?? row.confluence_type_id} className="hover:bg-panel/50 transition-colors">
                        <td className="py-2 pr-4 text-text-primary">{row.confluence_name}</td>
                        <td className="py-2 px-2 text-right text-text-faint">{row.total_trades}</td>
                        <td className="py-2 px-2 text-right">{formatPercent(row.win_rate)}</td>
                        <td className="py-2 pl-2 text-right text-text-faint">{row.avg_r != null ? row.avg_r.toFixed(2) : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Por confluencia combo */}
          {confluenceComboStats && confluenceComboStats.length > 0 && confluenceComboStats.some((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP) && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">POR CONFLUENCIA (COMBO)</h3>
              <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full text-left font-mono text-[12px] max-w-xl">
                  <thead>
                    <tr className="text-text-faint border-b border-hairline">
                      <th className="font-normal pb-2 pr-4">Combinación</th>
                      <th className="font-normal pb-2 px-2 text-right">Trades</th>
                      <th className="font-normal pb-2 px-2 text-right">Win rate</th>
                      <th className="font-normal pb-2 pl-2 text-right">Avg R</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline/60">
                    {confluenceComboStats.filter((r) => (r.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP).map((row, i) => (
                      <tr key={i} className="hover:bg-panel/50 transition-colors">
                        <td className="py-2 pr-4 text-text-primary">{row.confluence_names?.join(' + ') ?? '\u2014'}</td>
                        <td className="py-2 px-2 text-right text-text-faint">{row.total_trades}</td>
                        <td className="py-2 px-2 text-right">{formatPercent(row.win_rate)}</td>
                        <td className="py-2 pl-2 text-right text-text-faint">{row.avg_r != null ? row.avg_r.toFixed(2) : '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Frecuencia de comportamientos (v_user_psychology_stats) — % de
              cuenta completa, distinto de PsychologyStatsCard (rendimiento
              POR tag). Acá la pregunta es "¿qué tan seguido pasa esto?". */}
          {psychologyPctStats && (psychologyPctStats.total_trades ?? 0) >= MIN_SAMPLE_FOR_HEATMAP && (
            <div>
              <h3 className="font-mono text-[11px] text-text-faint tracking-wide mb-3">FRECUENCIA DE COMPORTAMIENTOS</h3>
              <div className="space-y-2 max-w-xl">
                {PSYCHOLOGY_PCT_LABELS.map(({ key, label }) => {
                  const pct = psychologyPctStats[key] as number | null
                  if (pct == null) return null
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className="font-body text-[12px] text-text-muted w-40 shrink-0">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-panel-2 overflow-hidden">
                        <div
                          className="h-full bg-signal/70 rounded-full transition-all"
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] text-text-faint w-10 text-right shrink-0">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
