import { TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'

interface CurvePoint {
  label: string
  value: number
}

interface BankrollCurveProps {
  points: CurvePoint[]
  openingBalance: number
}

function compactUsd(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function BankrollCurve({ points, openingBalance }: BankrollCurveProps) {
  const width = 800
  const height = 220
  const top = 22
  const bottom = 34
  const values = points.map((point) => point.value)
  const min = Math.min(...values, openingBalance) - 200
  const max = Math.max(...values, openingBalance) + 200
  const chartHeight = height - top - bottom
  const pointAt = (point: CurvePoint, index: number) => ({
    x: (index / Math.max(1, points.length - 1)) * width,
    y: top + ((max - point.value) / (max - min || 1)) * chartHeight,
  })
  const coords = points.map(pointAt)
  const line = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const fill = `${line} ${width},${height - bottom} 0,${height - bottom}`
  const mid = top + ((max - openingBalance) / (max - min || 1)) * chartHeight
  const latestValue = points.at(-1)?.value ?? openingBalance
  const pctChange = openingBalance > 0 ? ((latestValue - openingBalance) / openingBalance) * 100 : 0

  return (
    <section aria-labelledby="bankroll-curve-title" className="overflow-hidden rounded-xl border border-hairline bg-panel">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-4 sm:px-5">
        <div>
          <p className="label-mono">Evolución consolidada</p>
          <h2 id="bankroll-curve-title" className="mt-1 font-display text-[19px] text-text-primary">Curva de equidad del bankroll</h2>
        </div>
        <span className={`inline-flex items-center gap-1.5 font-mono text-[12px] font-semibold ${pctChange >= 0 ? 'text-gain' : 'text-loss'}`}>
          <TrendingUp className="h-4 w-4" aria-hidden="true" /> {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}% desde el inicio
        </span>
      </div>
      <div className="px-3 pb-2 pt-4 sm:px-5">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[220px] w-full overflow-visible" role="img" aria-label={`El bankroll pasó de ${compactUsd(openingBalance)} a ${compactUsd(points.at(-1)?.value ?? openingBalance)}.`}>
          <defs>
            <linearGradient id="funded-curve-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--color-gain)" stopOpacity="0.18" />
              <stop offset="1" stopColor="var(--color-gain)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.2, 0.5, 0.8].map((ratio) => <line key={ratio} x1="0" x2={width} y1={top + chartHeight * ratio} y2={top + chartHeight * ratio} stroke="var(--color-hairline)" strokeWidth="1" />)}
          <line x1="0" x2={width} y1={mid} y2={mid} stroke="var(--color-text-faint)" strokeDasharray="4 5" strokeOpacity="0.5" />
          <polygon points={fill} fill="url(#funded-curve-fill)" />
          <polyline points={line} fill="none" stroke="var(--color-gain)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {coords.map(({ x, y }, index) => <circle key={points[index].label} cx={x} cy={y} r={index === coords.length - 1 ? 4 : 2.5} fill="var(--color-panel)" stroke="var(--color-gain)" strokeWidth="2" />)}
          {points.filter((_, index) => index === 0 || index === points.length - 1 || index === Math.floor(points.length / 2)).map((point) => {
            const index = points.indexOf(point)
            return <text key={point.label} x={coords[index].x} y={height - 6} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'} fill="var(--color-text-faint)" fontSize="11">{point.label}</text>
          })}
        </svg>
      </div>
      <div className="grid grid-cols-3 border-t border-hairline">
        <CurveFact label="Capital inicial" value={compactUsd(openingBalance)} />
        <CurveFact label="Mejor punto" value={compactUsd(Math.max(...values))} />
        <CurveFact label="Bankroll actual" value={compactUsd(points.at(-1)?.value ?? openingBalance)} highlight />
      </div>
    </section>
  )
}

function CurveFact({ label, value, highlight = false }: { label: string; value: ReactNode; highlight?: boolean }) {
  return <div className="min-w-0 border-r border-hairline px-3 py-3 last:border-r-0 sm:px-5"><p className="label-mono text-[9px]">{label}</p><p className={`num mt-1 truncate text-[13px] font-semibold sm:text-[15px] ${highlight ? 'text-gain' : 'text-text-primary'}`}>{value}</p></div>
}
