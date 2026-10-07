import type { TradeDirection } from '../../lib/positionSize'

// Mapa de precios del plan: la zona hasta el objetivo (verde) y la zona hasta el
// stop (rojo) a escala real. Verde/rojo aquí sí son ganancia/pérdida potencial.

interface PriceMapProps {
  direction: TradeDirection
  entry: number
  stop: number
  target: number
  /** Versión estrecha (móvil): solo los precios, sin nombres. */
  compact?: boolean
}

interface Geometry {
  width: number
  height: number
  top: number
  bottom: number
  barX: number
  barWidth: number
  textX: number
  fontSize: number
  blockHeight: number
  showNames: boolean
}

const WIDE: Geometry = { width: 150, height: 200, top: 12, bottom: 192, barX: 14, barWidth: 8, textX: 36, fontSize: 11, blockHeight: 34, showNames: true }
const NARROW: Geometry = { width: 104, height: 150, top: 10, bottom: 139, barX: 6, barWidth: 7, textX: 26, fontSize: 10, blockHeight: 14, showNames: false }

const price = (value: number) => value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

interface Level {
  key: 'target' | 'entry' | 'stop'
  name: string
  value: number
  y: number
}

export function PriceMap({ direction, entry, stop, target, compact = false }: PriceMapProps) {
  const g = compact ? NARROW : WIDE
  const highest = Math.max(entry, stop, target)
  const lowest = Math.min(entry, stop, target)
  const span = highest - lowest || 1
  const yOf = (value: number) => g.top + ((highest - value) / span) * (g.bottom - g.top)

  const unsorted: Level[] = [
    { key: 'target' as const, name: 'Objetivo', value: target, y: yOf(target) },
    { key: 'entry' as const, name: 'Entrada', value: entry, y: yOf(entry) },
    { key: 'stop' as const, name: 'Stop', value: stop, y: yOf(stop) },
  ]
  const levels = [...unsorted].sort((a, b) => a.y - b.y)

  // Cada etiqueta se centra en su nivel, sin salirse del dibujo ni pisar a la vecina.
  const tops: number[] = []
  levels.forEach((level, index) => {
    const desired = level.y - g.blockHeight / 2
    const min = index === 0 ? 0 : tops[index - 1] + g.blockHeight + 2
    const max = g.height - g.blockHeight
    tops.push(Math.min(Math.max(desired, min), max))
  })

  const targetY = yOf(target)
  const entryY = yOf(entry)
  const stopY = yOf(stop)
  const gainZone = { y: Math.min(targetY, entryY), height: Math.abs(targetY - entryY) }
  const lossZone = { y: Math.min(stopY, entryY), height: Math.abs(stopY - entryY) }
  const label = `Mapa de precios en ${direction === 'long' ? 'largo' : 'corto'}: objetivo ${price(target)}, entrada ${price(entry)}, stop ${price(stop)}`

  return (
    <svg viewBox={`0 0 ${g.width} ${g.height}`} width={g.width} height={g.height} role="img" aria-label={label} className="block max-w-full">
      <rect x={g.barX} y={gainZone.y} width={g.barWidth} height={gainZone.height} rx={2} className="fill-gain" />
      <rect x={g.barX} y={lossZone.y} width={g.barWidth} height={lossZone.height} rx={2} className="fill-loss" />
      {levels.map((level) => (
        <path key={level.key} d={`M${g.barX} ${level.y}H${g.barX + g.barWidth + 8}`} className="stroke-text-faint" />
      ))}
      {levels.map((level, index) => (
        <g key={level.key} fontSize={g.fontSize} className="num">
          {g.showNames && <text x={g.textX} y={tops[index] + 11} className="fill-text-faint">{level.name}</text>}
          <text x={g.textX} y={tops[index] + (g.showNames ? 27 : 11)} className="fill-text-primary">{price(level.value)}</text>
        </g>
      ))}
    </svg>
  )
}
