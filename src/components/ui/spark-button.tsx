import type { ButtonHTMLAttributes, Ref } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../../lib/utils'

interface SparkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  ref?: Ref<HTMLButtonElement>
}

// Acción principal DENTRO de una tarjeta azul (brand): ahí el botón `cta` azul se
// perdería, así que se invierte a amarillo con borde de tinta. Mismo peso que `cta`:
// máximo uno por tarjeta y nunca junto a un `cta` en la misma pantalla.
export function SparkButton({ className, asChild = false, ref, ...props }: SparkButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp
      ref={ref}
      className={cn(
        'inline-flex min-h-[50px] items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border-2 border-ink bg-spark px-6 font-body text-[15px] font-extrabold text-on-spark transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}
