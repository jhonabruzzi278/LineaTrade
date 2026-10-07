import type { ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon
  /** Nombre accesible (obligatorio: el botón no tiene texto visible). */
  label: string
  tone?: 'neutral' | 'danger'
}

// Botón de solo ícono con objetivo táctil de 44px.
export function IconButton({ icon: Icon, label, tone = 'neutral', className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors',
        tone === 'danger' ? 'text-loss hover:bg-loss/10' : 'text-text-faint hover:bg-panel-2 hover:text-text-primary',
        className,
      )}
      {...rest}
    >
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </button>
  )
}
