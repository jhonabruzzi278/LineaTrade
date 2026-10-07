import type { ReactNode } from 'react'
import { Card } from '../ui/card'
import { cn } from '@/lib/utils'

interface AccountSectionProps {
  title: string
  /** Contenido alineado a la derecha del título (contador, botón…). */
  aside?: ReactNode
  children: ReactNode
  className?: string
}

// Tarjeta de sección de la zona Cuenta: título en Archivo expandido y cuerpo.
export function AccountSection({ title, aside, children, className }: AccountSectionProps) {
  return (
    <Card as="section" className={cn('p-4 lg:px-6 lg:py-[22px]', className)} aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[17px] text-text-primary">{title}</h2>
        {aside}
      </div>
      <div className="mt-3.5">{children}</div>
    </Card>
  )
}

interface AccountRowProps {
  title: ReactNode
  description?: ReactNode
  /** Control a la derecha (botón, interruptor). */
  control?: ReactNode
  /** Contenido bajo la descripción (etiquetas, barras de avance). */
  footer?: ReactNode
  leading?: ReactNode
  muted?: boolean
  className?: string
}

// Fila de lista con borde superior (el primer hijo no lleva borde).
export function AccountRow({ title, description, control, footer, leading, muted = false, className }: AccountRowProps) {
  return (
    <div className={cn('flex items-center justify-between gap-4 border-t border-hairline py-3.5 first:border-t-0 first:pt-0', className)}>
      {leading}
      <div className={cn('min-w-0 flex-1', muted && 'opacity-60')}>
        <div className="font-body text-[15px] font-semibold text-text-primary">{title}</div>
        {description && <div className="mt-[3px] font-body text-[13px] leading-normal text-text-faint">{description}</div>}
        {footer && <div className="mt-2">{footer}</div>}
      </div>
      {control && <div className="flex shrink-0 items-center gap-1">{control}</div>}
    </div>
  )
}
