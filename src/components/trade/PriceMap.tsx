import { cn } from '@/lib/utils'

type MarkerKey = 'stop' | 'entry' | 'exit' | 'target'

interface Marker {
  key: MarkerKey
  label: string
  price: number
}

interface PriceMapProps {
  entry: number
  exit: number | null
  stopLoss: number | null
  takeProfit: number | null
  /** Resultado del trade: pinta el tramo entrada→salida (ganancia o pérdida). */
  isWin: boolean | null
  caption?: string
}

// Colores por significado: stop = pérdida potencial, take profit = ganancia
// objetivo, entrada = marca, salida = neutro. No se usa verde/rojo para nada más.
const TEXT_TONE: Record<MarkerKey, string> = {
  stop: 'text-loss',
  entry: 'text-steel',
  exit: 'text-text-primary',
  target: 'text-gain',
}
const DOT_TONE: Record<MarkerKey, string> = {
  stop: 'bg-loss',
  entry: 'bg-signal',
  exit: 'bg-text-primary',
  target: 'bg-gain',
}

function formatPrice(price: number): string {
  return price.toFixed(2)
}

function buildMarkers({ entry, exit, stopLoss, takeProfit }: PriceMapProps): Marker[] {
  const markers: Marker[] = [{ key: 'entry', label: 'Entrada', price: entry }]
  if (exit != null) markers.push({ key: 'exit', label: 'Salida', price: exit })
  if (stopLoss != null) markers.push({ key: 'stop', label: 'Stop loss', price: stopLoss })
  if (takeProfit != null) markers.push({ key: 'target', label: 'Take profit', price: takeProfit })
  return markers
}

const ROW_HEIGHT = 46

// «Mapa de precio»: dónde quedaron entrada, salida, stop y take profit. Horizontal y
// proporcional en escritorio; lista vertical (de mayor a menor precio) en móvil.
export function PriceMap(props: PriceMapProps) {
  const markers = buildMarkers(props)
  const prices = markers.map((m) => m.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const span = max - min
  const position = (price: number) => (span === 0 ? 50 : ((price - min) / span) * 100)

  const entryMarker = markers.find((m) => m.key === 'entry')!
  const exitMarker = markers.find((m) => m.key === 'exit')
  const segmentClass = props.isWin == null ? 'bg-text-faint' : props.isWin ? 'bg-gain' : 'bg-loss'

  const ordered = [...markers].sort((a, b) => b.price - a.price)
  const entryRow = ordered.findIndex((m) => m.key === 'entry')
  const exitRow = ordered.findIndex((m) => m.key === 'exit')

  return (
    <div>
      {/* Escritorio: eje horizontal proporcional. */}
      <div className="relative mx-10 mt-1.5 hidden h-[86px] lg:block" role="img" aria-label={describe(markers)}>
        <div className="absolute inset-x-0 top-1.5 h-0.5 bg-input" />
        {exitMarker && (
          <div
            className={cn('absolute top-1 h-1.5 rounded-full opacity-85', segmentClass)}
            style={{
              left: `${Math.min(position(entryMarker.price), position(exitMarker.price))}%`,
              width: `${Math.abs(position(entryMarker.price) - position(exitMarker.price))}%`,
            }}
          />
        )}
        {markers.map((marker) => (
          <div
            key={marker.key}
            className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${position(marker.price)}%` }}
          >
            <span className={cn('h-3.5 w-3.5 rounded-full border-[3px] border-panel', DOT_TONE[marker.key])} />
            <span className={cn('mt-2.5 whitespace-nowrap font-mono text-[10px] font-semibold uppercase tracking-[0.08em]', TEXT_TONE[marker.key])}>
              {marker.label}
            </span>
            <span className="num mt-0.5 text-[13px] text-text-primary">{formatPrice(marker.price)}</span>
          </div>
        ))}
      </div>

      {/* Móvil: lista vertical. */}
      <ol className="relative pl-7 lg:hidden" aria-label="Niveles de precio, de mayor a menor">
        <span className="absolute bottom-2 left-1.5 top-2 w-0.5 bg-input" aria-hidden="true" />
        {exitMarker && entryRow !== exitRow && (
          <span
            className={cn('absolute left-1.5 w-0.5', segmentClass)}
            style={{
              top: `${Math.min(entryRow, exitRow) * ROW_HEIGHT + ROW_HEIGHT / 2}px`,
              height: `${Math.abs(entryRow - exitRow) * ROW_HEIGHT}px`,
            }}
            aria-hidden="true"
          />
        )}
        {ordered.map((marker) => (
          <li key={marker.key} className="relative flex items-center justify-between" style={{ minHeight: ROW_HEIGHT }}>
            <span className={cn('absolute -left-7 h-3.5 w-3.5 rounded-full border-[3px] border-panel', DOT_TONE[marker.key])} aria-hidden="true" />
            <span className={cn('font-mono text-[11px] font-semibold uppercase tracking-[0.08em]', TEXT_TONE[marker.key])}>{marker.label}</span>
            <span className="num text-[14px] text-text-primary">{formatPrice(marker.price)}</span>
          </li>
        ))}
      </ol>

      {props.caption && <p className="num mt-3.5 text-[11px] text-text-faint lg:text-[12px]">{props.caption}</p>}
    </div>
  )
}

function describe(markers: Marker[]): string {
  return markers.map((m) => `${m.label} ${formatPrice(m.price)}`).join(', ')
}
