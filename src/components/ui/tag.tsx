import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Etiqueta pequeña en mono (estado, tipo, «PRÁCTICA», «NUEVO»). Verde/rojo solo
// para significado financiero; el resto usa neutro, marca o amarillo.
type TagTone = 'neutral' | 'brand' | 'gain' | 'loss' | 'spark' | 'solid-spark'

const TONE: Record<TagTone, string> = {
  neutral: 'bg-panel-2 text-text-muted',
  brand: 'bg-signal/15 text-steel',
  gain: 'bg-gain/15 text-gain',
  loss: 'bg-loss/15 text-loss',
  spark: 'bg-spark/15 text-spark',
  'solid-spark': 'bg-spark text-on-spark',
}

export function Tag({ tone = 'neutral', className, children }: { tone?: TagTone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded px-2 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.04em]', TONE[tone], className)}>
      {children}
    </span>
  )
}
