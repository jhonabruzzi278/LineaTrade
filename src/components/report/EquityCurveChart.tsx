import type { EquityPoint } from '../../lib/reportCompute'
import { formatSignedDecimal } from '../../lib/reportFormat'

// SVG a mano, sin librería de gráficos (mismo criterio que TraceLine.tsx). Los colores
// salen de tokens vía clases (`stroke-steel`, `stop-…` por style con var()), así el
// gráfico sigue al tema claro/oscuro sin hex sueltos.
const VIEW_W = 900
const VIEW_H = 220
const MARGIN_Y = 14

function formatAxisDate(iso: string, today: Date): string {
  const date = new Date(iso)
  const sameDay =
    date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()
  if (sameDay) return 'hoy'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
}

export function EquityCurveChart({ points, now = new Date() }: { points: EquityPoint[]; now?: Date }) {
  if (points.length < 2) {
    return (
      <div className="flex h-[160px] items-center justify-center text-center sm:h-[220px]">
        <p className="max-w-sm font-body text-[13px] text-text-faint">
          Hacen falta al menos 2 trades cerrados en este periodo para trazar la curva de capital.
        </p>
      </div>
    )
  }

  const values = points.map((p) => p.cumulative)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1
  const xFor = (index: number) => (index / (points.length - 1)) * VIEW_W
  const yFor = (value: number) => VIEW_H - MARGIN_Y - ((value - min) / range) * (VIEW_H - MARGIN_Y * 2)

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)} ${yFor(p.cumulative).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${VIEW_W} ${VIEW_H} L0 ${VIEW_H} Z`
  const zeroY = yFor(0)
  const last = values[values.length - 1]

  return (
    <div>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="block h-[160px] w-full sm:h-[220px]"
        role="img"
        aria-label={`Curva de capital: P&L acumulado de ${points.length} operaciones cerradas, termina en ${formatSignedDecimal(last)}`}
      >
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--color-signal)', stopOpacity: 0.28 }} />
            <stop offset="1" style={{ stopColor: 'var(--color-signal)', stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line key={fraction} x1="0" x2={VIEW_W} y1={VIEW_H * fraction} y2={VIEW_H * fraction} className="stroke-hairline" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {min < 0 && max > 0 && (
          <line x1="0" x2={VIEW_W} y1={zeroY} y2={zeroY} className="stroke-text-faint" strokeWidth="1" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
        )}
        <path d={areaPath} fill="url(#equity-fill)" />
        <path d={linePath} fill="none" className="stroke-steel" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="num mt-2 flex justify-between text-[10px] text-text-faint sm:text-[11px]">
        <span>{formatAxisDate(points[0].tradedAt, now)}</span>
        <span>{formatAxisDate(points[points.length - 1].tradedAt, now)}</span>
      </div>
    </div>
  )
}
