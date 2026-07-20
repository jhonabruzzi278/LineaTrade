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
}

export function MetricCard({ label, value, icon, tone = 'default' }: MetricCardProps) {
  return (
    <div className="group rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel px-4 py-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-signal/30 hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <p className={`font-display text-[22px] tabular-nums ${METRIC_TONE_CLASS[tone]}`}>{value}</p>
        {icon && (
          <span className="text-text-faint shrink-0 mt-1 transition-colors duration-200 group-hover:text-signal">
            {icon}
          </span>
        )}
      </div>
      <p className="font-mono text-[11px] text-text-faint mt-1 tracking-wide">{label}</p>
    </div>
  )
}
