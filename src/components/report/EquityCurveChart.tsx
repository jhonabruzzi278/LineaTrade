import type { EquityPoint } from '../../lib/reportStats'

// SVG a mano, sin librería nueva de charting — mismo criterio que TraceLine.tsx (este
// proyecto no suma una dependencia para una sola necesidad puntual; lightweight-charts
// se mantiene reservado y code-splitteado solo para /backtesting). Colores en hex
// crudo porque son atributos SVG, no clases Tailwind — mismo caso ya documentado para
// TraceLine.tsx en CLAUDE.md; deben mantenerse en sync con --color-gain/--color-loss
// de src/styles/tokens.css.
const GAIN = '#0ECB81'
const LOSS = '#F6465D'

const VIEW_W = 700
const VIEW_H = 220
const MARGIN_Y = 12

export function EquityCurveChart({ points }: { points: EquityPoint[] }) {
  if (points.length < 2) {
    return (
      <div className="h-[220px] flex items-center justify-center">
        <p className="font-body text-[13px] text-text-faint">
          Hacen falta al menos 2 trades cerrados para trazar la curva de capital.
        </p>
      </div>
    )
  }

  const values = points.map((p) => p.cumulative)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const range = max - min || 1

  function xFor(index: number): number {
    return (index / (points.length - 1)) * VIEW_W
  }
  function yFor(value: number): number {
    const usable = VIEW_H - MARGIN_Y * 2
    return VIEW_H - MARGIN_Y - ((value - min) / range) * usable
  }

  const isPositive = values[values.length - 1] >= 0
  const stroke = isPositive ? GAIN : LOSS

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.cumulative).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`
  const zeroY = yFor(0)

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full h-[220px]"
      preserveAspectRatio="none"
      role="img"
      aria-label="Curva de capital: P&L acumulado por operación cerrada"
    >
      <defs>
        <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {min < 0 && max > 0 && (
        <line x1="0" y1={zeroY} x2={VIEW_W} y2={zeroY} stroke="#232935" strokeWidth="1" strokeDasharray="3,4" />
      )}

      <path d={areaPath} fill="url(#equity-fill)" stroke="none" />
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
