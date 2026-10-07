import { useEffect, useState } from 'react'
import { Check, Mail } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '@/lib/utils'

// Ilustración de «correo enviado»: sobre azul con sombra dura y sello de
// verificación en amarillo (el verde se reserva para ganancia/pérdida).
export function MailSentMark() {
  return (
    <div className="relative h-20 w-24" aria-hidden="true">
      <div className="absolute inset-0 flex items-center justify-center rounded-xl border-2 border-ink bg-signal text-on-signal shadow-[5px_5px_0_var(--color-pop)]">
        <Mail size={40} strokeWidth={1.8} />
      </div>
      <span className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-spark text-on-spark">
        <Check size={14} strokeWidth={3.2} />
      </span>
    </div>
  )
}

const CONFIRMATION_STEPS: ReadonlyArray<{ key: string; text: string; strongText?: string }> = [
  { key: 'confirm', text: 'Abre el correo de LineaTrade y toca ', strongText: 'Confirmar' },
  { key: 'profile', text: 'Completa tu perfil de trader (2 minutos).' },
  { key: 'trade', text: 'Registra tu primer trade.' },
]

export function ConfirmationSteps() {
  return (
    <ol className="border-b border-hairline">
      {CONFIRMATION_STEPS.map((step, index) => (
        <li key={step.key} className="flex items-start gap-3.5 border-t border-hairline py-3.5 font-body text-[15px] leading-snug text-text-muted">
          <span
            className={cn(
              'num flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] font-semibold',
              index === 0 ? 'bg-signal text-on-signal' : 'border border-hairline bg-panel-2 text-text-faint',
            )}
          >
            {index + 1}
          </span>
          <span>
            {step.text}
            {step.strongText && <b className="text-text-primary">{step.strongText}</b>}
          </span>
        </li>
      ))}
    </ol>
  )
}

const RESEND_COOLDOWN_MS = 30_000

type ResendStatus = 'idle' | 'sending' | 'sent' | 'error'

interface ResendButtonProps {
  // Reenvía el correo; devuelve un mensaje de error o null si salió bien.
  onResend: () => Promise<string | null>
}

// Botón «Reenviar correo» con enfriamiento de 30 s tras un envío exitoso, para
// no empujar al usuario a saturar el límite de envíos del proveedor de correo.
export function ResendButton({ onResend }: ResendButtonProps) {
  const [status, setStatus] = useState<ResendStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'sent') return
    const timer = window.setTimeout(() => setStatus('idle'), RESEND_COOLDOWN_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  async function handleClick() {
    setStatus('sending')
    setErrorMessage(null)
    const message = await onResend()
    if (message) {
      setErrorMessage(message)
      setStatus('error')
      return
    }
    setStatus('sent')
  }

  const label = status === 'sending' ? 'Reenviando...' : status === 'sent' ? 'Correo reenviado' : 'Reenviar correo'

  return (
    <div className="flex w-full flex-col items-stretch gap-2">
      <Button type="button" variant="outline" size="lg" className="w-full" disabled={status === 'sending' || status === 'sent'} onClick={() => void handleClick()}>
        {label}
      </Button>
      <p role={status === 'error' ? 'alert' : 'status'} className={cn('min-h-[1.25rem] text-center font-body text-[13px]', status === 'error' ? 'text-loss' : 'text-text-faint')}>
        {status === 'sent' && 'Revisa tu bandeja y la carpeta de spam.'}
        {status === 'error' && errorMessage}
      </p>
    </div>
  )
}
