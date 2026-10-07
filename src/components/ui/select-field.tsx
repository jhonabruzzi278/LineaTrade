import { ChevronDown } from 'lucide-react'
import type { ReactNode, SelectHTMLAttributes } from 'react'
import { FIELD_CLASS } from './field'
import { cn } from '@/lib/utils'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string
  label: string
  hint?: ReactNode
}

// Selector nativo con la misma altura/borde que <Field>, etiqueta arriba y
// chevron propio (appearance none) para que se vea igual en todos los
// navegadores. Se mantiene el <select> nativo por accesibilidad y por el
// selector del sistema en móvil.
export function SelectField({ id, label, hint, className, children, ...rest }: SelectFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-[12px] font-semibold text-text-faint">
        {label}
      </label>
      <div className="relative">
        <select id={id} className={cn(FIELD_CLASS, 'appearance-none pr-10', className)} {...rest}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
      </div>
      {hint && <p className="font-body text-[11px] text-text-faint">{hint}</p>}
    </div>
  )
}
