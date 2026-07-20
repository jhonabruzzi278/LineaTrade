import type { ComponentProps } from 'react'
import * as AccordionPrimitive from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

// Adaptado de shadcn/ui: colores y hover reusan los tokens existentes (hairline,
// text-primary/muted/faint, signal) en vez de la paleta neutra por defecto de shadcn —
// ver docs/lineatrade-design-system.md §3.5. La animación de apertura/cierre usa las
// keyframes accordion-down/up definidas a mano en src/index.css (mismo patrón que
// .reveal-up), no el paquete tw-animate-css.

const Accordion = AccordionPrimitive.Root

function AccordionItem({ className, ...props }: ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn('border-b border-hairline', className)} {...props} />
}

function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          'flex flex-1 cursor-pointer items-center justify-between py-4 font-body text-text-primary transition-colors hover:text-signal [&[data-state=open]>svg]:[transform:rotate(180deg)]',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 shrink-0 text-text-faint transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      className="overflow-hidden text-sm text-text-muted data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
      {...props}
    >
      <div className={cn('pb-4 pt-0 leading-relaxed', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
