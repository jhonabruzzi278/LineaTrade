import type { ReactNode } from 'react'

const METRIC_TONE_CLASS = {
  default: 'text-text-primary',
  gain: 'text-gain',
  loss: 'text-loss',
} as const

interface MetricCardProps {
  label: string
  value: string
  icon?: ReactNode
  tone?: keyof typeof METRIC_TONE_CLASS
  /** Línea de apoyo bajo la cifra («21 de 36 cerrados»). */
  hint?: string
}

// Tarjeta de métrica: etiqueta mono arriba, cifra tabular grande y una línea de
// apoyo opcional. Verde/rojo solo cuando la cifra es ganancia/pérdida.
export function MetricCard({ label, value, icon, tone = 'default', hint }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-hairline bg-panel px-4 py-3.5">
      <div className="flex items-start justify-between gap-2">
        <p className="label-mono">{label}</p>
        {icon && <span className="mt-0.5 shrink-0 text-text-faint">{icon}</span>}
      </div>
      <p className={`num mt-2 text-[26px] font-medium leading-none ${METRIC_TONE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="mt-1.5 font-body text-[12px] text-text-faint">{hint}</p>}
    </div>
  )
}
