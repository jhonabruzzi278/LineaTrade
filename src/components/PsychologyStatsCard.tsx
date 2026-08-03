import { useEffect, useState } from 'react'
import { getPsychologyTagStats, type PsychologyTagStat } from '../lib/psychologyStats'
import { getErrorMessage } from '../lib/errors'
import { formatPercent, formatNumber, formatSigned, signedTone } from '../lib/tradeDisplay'

export function PsychologyStatsCard() {
  const [stats, setStats] = useState<PsychologyTagStat[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPsychologyTagStats()
      .then((data) => {
        if (!cancelled) setStats(data.length > 0 ? data : null)
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
  }, [])

  if (loading) return null
  if (error) return null
  if (!stats) return null

  return (
    <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel shadow-card px-5 py-5 mb-8">
      <h2 className="font-display text-[18px] text-text-primary mb-4">Rendimiento por estado mental</h2>
      <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full text-left font-mono text-[12px]">
          <thead>
            <tr className="text-text-faint border-b border-hairline">
              <th className="font-normal pb-2 pr-4">Tag</th>
              <th className="font-normal pb-2 px-2 text-right">Trades</th>
              <th className="font-normal pb-2 px-2 text-right">Win rate</th>
              <th className="font-normal pb-2 px-2 text-right">Profit factor</th>
              <th className="font-normal pb-2 pl-2 text-right">Avg R</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline/60">
            {stats.map((row) => (
              <tr key={row.tag_name} className="hover:bg-panel/50 transition-colors">
                <td className="py-2.5 pr-4 text-text-primary">{row.tag_name}</td>
                <td className="py-2.5 px-2 text-right text-text-faint">{row.total_trades}</td>
                <td className="py-2.5 px-2 text-right">{formatPercent(row.win_rate)}</td>
                <td className="py-2.5 px-2 text-right">{formatNumber(row.profit_factor)}</td>
                <td className="py-2.5 pl-2 text-right">
                  <span className={signedTone(row.avg_r)}>{formatSigned(row.avg_r)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
