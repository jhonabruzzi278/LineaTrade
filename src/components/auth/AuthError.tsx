import { CircleAlert } from 'lucide-react'

interface AuthErrorProps {
  id: string
  message: string | null
}

// Error de formulario en línea: `role="alert"` para lectores de pantalla y un
// icono + texto, para no depender solo del color.
export function AuthError({ id, message }: AuthErrorProps) {
  if (!message) return null
  return (
    <div
      id={id}
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-loss/35 bg-loss/10 px-3 py-2.5 font-body text-[13px] text-loss"
    >
      <CircleAlert size={16} className="mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  )
}
