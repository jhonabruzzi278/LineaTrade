import type { InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Clases base de campos de formulario, para inputs/selects/textareas que no
// pasan por <Field>. 44px de alto mínimo (objetivo táctil) y 16px en móvil
// para que iOS no haga zoom al enfocar.
export const FIELD_CLASS =
  'min-h-11 w-full rounded-lg border border-input bg-ink px-3 font-body text-[16px] text-text-primary placeholder:text-text-faint transition-colors focus-visible:border-signal sm:text-[15px] disabled:opacity-60'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  hint?: ReactNode
  mono?: boolean
}

export function Field({ id, label, hint, mono = false, className, ...rest }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="font-body text-[12px] font-semibold text-text-faint">
        {label}
      </label>
      <input id={id} className={cn(FIELD_CLASS, mono && 'num', className)} {...rest} />
      {hint && <p className="font-body text-[11px] text-text-faint">{hint}</p>}
    </div>
  )
}
