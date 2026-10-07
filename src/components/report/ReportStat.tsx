import { Card } from '../ui/card'
import { cn } from '@/lib/utils'

type StatTone = 'default' | 'gain' | 'loss'

const TONE_CLASS: Record<StatTone, string> = {
  default: 'text-text-primary',
  gain: 'text-gain',
  loss: 'text-loss',
}

interface ReportStatProps {
  label: string
  /** Cifra o texto principal. `null` muestra «—». */
  value: string | null
  tone?: StatTone
  hint?: string
  /** `text` usa Figtree en negrita (nombres: «Martes», «Apertura NY»); `figure` usa cifras mono. */
  kind?: 'figure' | 'text' | 'compact'
}

// Tarjeta de una estadística del reporte: etiqueta mono, valor y una línea de apoyo.
// Verde/rojo solo cuando el valor es un resultado (ganancia/pérdida).
export function ReportStat({ label, value, tone = 'default', hint, kind = 'figure' }: ReportStatProps) {
  const valueClass =
    kind === 'text'
      ? 'font-body text-[18px] font-bold leading-tight sm:text-[20px]'
      : kind === 'compact'
        ? 'num text-[17px] font-medium leading-none sm:text-[20px]'
        : 'num text-[20px] font-medium leading-none sm:text-[24px]'
  return (
    <Card className="px-3.5 py-3 sm:px-[18px] sm:py-4">
      <p className="label-mono">{label}</p>
      <p className={cn('mt-2 break-words', valueClass, value == null ? 'text-text-faint' : TONE_CLASS[tone])}>{value ?? '—'}</p>
      {hint && <p className={cn('mt-1 font-body text-[11px] sm:text-[12px]', tone === 'default' ? 'text-text-faint' : cn('num', TONE_CLASS[tone]))}>{hint}</p>}
    </Card>
  )
}
