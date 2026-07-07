import type { ReactNode } from 'react'

export function MetricCard({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="border border-hairline rounded-sm bg-panel px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-display text-[22px] text-text-primary">{value}</p>
        {icon && <span className="text-text-faint shrink-0 mt-1">{icon}</span>}
      </div>
      <p className="font-mono text-[11px] text-text-faint mt-1 tracking-wide">{label}</p>
    </div>
  )
}
