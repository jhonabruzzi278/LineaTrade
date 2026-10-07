import { Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CalloutProps {
  tone?: 'info' | 'warning'
  children: ReactNode
  className?: string
}

// Aviso en línea. `info` para contexto (cómo se calcula, qué cuenta); `warning`
// para límites y descargos (muestra pequeña, «no es predicción»).
export function Callout({ tone = 'info', children, className }: CalloutProps) {
  const isWarning = tone === 'warning'
  const Icon = isWarning ? TriangleAlert : Info
  return (
    <div
      role={isWarning ? 'note' : undefined}
      className={cn(
        'flex items-start gap-3 rounded-[10px] border px-4 py-3 font-body text-[13px] leading-relaxed',
        isWarning ? 'border-spark/40 bg-spark/10 text-spark' : 'border-hairline bg-panel text-text-faint',
        className,
      )}
    >
      <Icon className={cn('mt-0.5 h-[18px] w-[18px] shrink-0', isWarning ? 'text-spark' : 'text-steel')} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
