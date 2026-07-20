import type { ButtonHTMLAttributes, Ref } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Adaptado de shadcn/ui: rounded-sm (no rounded-md/lg) para calzar con el radio de 2px
// que ya usa todo el producto, y los hover states de "default"/"destructive" reusan los
// tokens -dim que ya existían (signal-dim/loss-dim) en vez del hover:opacity-90 genérico
// de shadcn — mismo lenguaje de interacción que el resto de la app (ver
// docs/lineatrade-design-system.md §7, "Botón primario").
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm font-body text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-loss-dim',
        outline: 'border border-input bg-background hover:border-text-faint hover:bg-panel-2/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
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
