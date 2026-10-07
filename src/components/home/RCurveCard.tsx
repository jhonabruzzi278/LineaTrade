import { Card } from '../ui/card'
import { Tag } from '../ui/tag'
import { curveToPoints } from '../../lib/dashboardStats'
import { formatR } from '../../lib/tradeRowDisplay'

interface RCurveCardProps {
  /** Etiqueta del periodo: «30D», «7D» o «Todo». */
  periodLabel: string
  accumulatedR: number | null
  curve: number[]
  /** R acumulado del periodo menos el del periodo anterior; null si no se puede comparar. */
  deltaR: number | null
  rCount: number
}

const CURVE_WIDTH = 400
const CURVE_HEIGHT = 96

// Dato principal de Inicio: R acumulado del periodo con su curva. Es una cifra de
// resultado (P&L en R), por eso es la única tarjeta azul de la pantalla.
export function RCurveCard({ periodLabel, accumulatedR, curve, deltaR, rCount }: RCurveCardProps) {
  const hasData = accumulatedR != null
  const points = curveToPoints(curve, CURVE_WIDTH, CURVE_HEIGHT)

  return (
    <Card tone="brand" as="section" className="px-3.5 pb-2 pt-2.5 sm:px-3.5 sm:pt-3">
      <div className="flex items-center justify-between gap-2">
        <span className="label-mono text-on-signal/80">R acum. · {periodLabel}</span>
        {deltaR != null && (
          <span title="Variación frente al periodo anterior de igual duración">
            <Tag tone="solid-spark" className="num text-[11px]">
              <span className="sr-only">Variación frente al periodo anterior: </span>
              {formatR(deltaR)}
            </Tag>
          </span>
        )}
      </div>

      {hasData ? (
        <div className="mt-1.5 flex items-end gap-3.5 lg:flex-col lg:items-stretch lg:gap-1.5">
          <p className="font-display shrink-0 text-[30px] leading-none">{formatR(accumulatedR)}</p>
          <svg
            viewBox={`0 0 ${CURVE_WIDTH} ${CURVE_HEIGHT}`}
            preserveAspectRatio="none"
            className="block h-7 w-full"
            role="img"
            aria-label={`Curva de R acumulado, ${rCount} trades con R en el periodo`}
          >
            <polyline
              points={points}
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      ) : (
        <div className="mt-1.5">
          <p className="font-display text-[30px] leading-none text-on-signal/60">—</p>
          <p className="mt-1.5 pb-1 font-body text-[12px] text-on-signal/80">Sin trades cerrados con R en este periodo.</p>
        </div>
      )}
    </Card>
  )
}
