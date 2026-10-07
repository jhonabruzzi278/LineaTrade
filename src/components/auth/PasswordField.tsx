import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FIELD_CLASS } from '@/components/ui/field'
import { getPasswordStrength } from '@/lib/passwordStrength'
import { cn } from '@/lib/utils'

interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'value' | 'onChange'> {
  id: string
  label: string
  value: string
  onValueChange: (value: string) => void
  // Enlace u otro control a la derecha de la etiqueta (p. ej. «¿La olvidaste?»).
  labelAside?: ReactNode
  // Id del mensaje de error asociado: marca el campo como inválido.
  errorId?: string
  // Muestra el medidor de fortaleza bajo el campo (solo para crear contraseña).
  showStrength?: boolean
}

const STRENGTH_SEGMENTS = [1, 2, 3] as const

// Campo de contraseña con botón de mostrar/ocultar de 44px y medidor opcional.
// Mismo marco que <Field> (etiqueta + FIELD_CLASS) para que se vea igual que el
// resto de los formularios de la app.
export function PasswordField({
  id,
  label,
  value,
  onValueChange,
  labelAside,
  errorId,
  showStrength = false,
  className,
  ...rest
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  const strength = getPasswordStrength(value)
  const strengthId = `${id}-strength`
  const describedBy = [errorId, showStrength ? strengthId : undefined].filter(Boolean).join(' ') || undefined

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="font-body text-[12px] font-semibold text-text-faint">
          {label}
        </label>
        {labelAside}
      </div>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={errorId ? true : undefined}
          aria-describedby={describedBy}
          className={cn(FIELD_CLASS, 'pr-12', errorId && 'border-loss', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-[10px] text-text-faint transition-colors hover:text-text-primary"
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
      {showStrength && (
        <div id={strengthId} className="flex flex-col gap-1.5 pt-0.5">
          <div className="flex gap-1.5" aria-hidden="true">
            {STRENGTH_SEGMENTS.map((segment) => (
              <span
                key={segment}
                className={cn('h-1 flex-1 rounded-full transition-colors', segment <= strength.level ? 'bg-signal' : 'bg-hairline')}
              />
            ))}
          </div>
          <span className="num text-[12px] text-text-faint" aria-live="polite">
            {strength.label}
          </span>
        </div>
      )}
    </div>
  )
}
