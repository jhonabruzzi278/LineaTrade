import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  label: string
  tone?: 'signal' | 'spark' | 'gain'
  className?: string
}

// Barra de avance. `spark` para práctica/checklist, `signal` para formación y
// progreso general. Siempre con aria-valuenow para lectores de pantalla.
export function ProgressBar({ value, label, tone = 'signal', className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  const fill = tone === 'spark' ? 'bg-spark' : tone === 'gain' ? 'bg-gain' : 'bg-signal'
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={cn('h-1.5 overflow-hidden rounded-full bg-panel-2', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-300', fill)} style={{ width: `${pct}%` }} />
    </div>
  )
}
