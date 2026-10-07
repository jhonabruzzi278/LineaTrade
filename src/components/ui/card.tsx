import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Superficie base del sistema: panel con borde fino y radio de 12px. Variantes:
// `brand` (azul con sombra dura, para el dato principal de la pantalla — máximo
// una por vista), `spark` (amarillo, para «qué revisar» y avisos destacados) y
// `dashed` (estados vacíos).
type CardTone = 'default' | 'brand' | 'spark' | 'dashed'

const TONE: Record<CardTone, string> = {
  default: 'border border-hairline bg-panel',
  brand: 'border-2 border-ink bg-signal text-on-signal shadow-pop',
  spark: 'bg-spark text-on-spark',
  dashed: 'border border-dashed border-hairline bg-transparent',
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  tone?: CardTone
  as?: 'div' | 'section' | 'article' | 'aside'
  children: ReactNode
}

export function Card({ tone = 'default', as: Tag = 'div', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cn('rounded-xl p-4 sm:p-5', TONE[tone], className)} {...rest}>
      {children}
    </Tag>
  )
}
