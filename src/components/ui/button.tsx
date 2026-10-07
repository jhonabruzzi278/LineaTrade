import type { ButtonHTMLAttributes, Ref } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Botones del sistema Fusión. `cta` es la acción principal (azul + sombra dura
// amarilla; máximo uno por pantalla). `outline` es la secundaria, `danger` la
// destructiva. Todos con objetivo táctil de 44px como mínimo salvo `sm`.
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-body text-[14px] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        cta: 'cta',
        default: 'bg-primary text-primary-foreground font-bold hover:bg-signal-dim',
        outline: 'border border-input bg-transparent font-bold text-text-primary hover:border-text-faint hover:bg-panel',
        secondary: 'bg-secondary font-semibold text-secondary-foreground hover:bg-panel-2/70',
        ghost: 'font-semibold text-text-muted hover:bg-panel hover:text-text-primary',
        danger: 'border border-loss/40 bg-transparent font-bold text-loss hover:bg-loss/10',
        link: 'font-semibold text-steel underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-11 px-5 py-2',
        sm: 'min-h-9 px-3 text-[13px]',
        lg: 'min-h-[52px] px-6 text-[15px]',
        icon: 'h-11 w-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
  ref?: Ref<HTMLButtonElement>
}

export function Button({ className, variant, size, asChild = false, ref, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
}

export { buttonVariants }
