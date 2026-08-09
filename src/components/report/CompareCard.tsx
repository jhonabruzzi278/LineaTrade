// Tarjeta de comparación (Mejor/Peor Día, Semana, Modelo, etc.) para /reporte — mismo
// rail de color de 3px a la izquierda que TradeListRow.tsx ya usa para gain/loss, acá
// aplicado a un resultado agregado en vez de a un trade individual.
const RAIL_CLASS = {
  gain: 'bg-gain/60',
  loss: 'bg-loss/60',
  neutral: 'bg-hairline',
} as const

interface CompareCardProps {
  title: string
  valueLabel: string
  valueTone: keyof typeof RAIL_CLASS
  subLabel: string
}

export function CompareCard({ title, valueLabel, valueTone, subLabel }: CompareCardProps) {
  return (
    <div className="relative overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel px-4 py-4 shadow-card">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${RAIL_CLASS[valueTone]}`} aria-hidden="true" />
      <p className="font-mono text-[11px] text-text-faint tracking-wide mb-1.5">{title}</p>
      <p className="font-display text-[18px] text-text-primary tabular-nums truncate">{valueLabel}</p>
      <p className="font-body text-[12px] text-text-faint mt-1">{subLabel}</p>
    </div>
  )
}

export function EmptyCompareCard({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="relative overflow-hidden rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel px-4 py-4 shadow-card">
      <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${RAIL_CLASS.neutral}`} aria-hidden="true" />
      <p className="font-mono text-[11px] text-text-faint tracking-wide mb-1.5">{title}</p>
      <p className="font-display text-[18px] text-text-faint">—</p>
      <p className="font-body text-[12px] text-text-faint mt-1">{reason}</p>
    </div>
  )
}
