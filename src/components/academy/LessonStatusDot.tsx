import { Check, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LessonStatus } from './lessonStatus'

// Estado de una lección: hecha (azul sólido con check), actual (anillo azul con
// play) o pendiente (círculo vacío). Azul de marca y forma, no verde: el verde
// se reserva para ganancia/pérdida.
export function LessonStatusDot({ status, className }: { status: LessonStatus; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
        status === 'done' && 'border-signal bg-signal text-on-signal',
        status === 'current' && 'border-signal bg-signal/20 text-steel',
        status === 'pending' && 'border-hairline text-transparent',
        className,
      )}
    >
      {status === 'done' && <Check className="h-3.5 w-3.5" strokeWidth={3.4} />}
      {status === 'current' && <Play className="h-2.5 w-2.5 translate-x-px" fill="currentColor" />}
    </span>
  )
}
