import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { PromiseAside } from '../components/auth/AuthAsides'
import { AuthError } from '../components/auth/AuthError'
import { AuthActions, AuthIntro, AuthLayout } from '../components/auth/AuthLayout'
import { MailSentMark } from '../components/auth/MailSent'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

const ERROR_ID = 'recuperar-error'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    // Supabase nunca revela si el correo existe (previene enumeración de cuentas) —
    // solo devuelve error en fallos reales (rate limit, red), nunca por "no encontrado".
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/actualizar-password`,
    })
    setLoading(false)
    if (resetError) {
      setError(getErrorMessage(resetError))
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <AuthLayout aside={<PromiseAside />}>
        <div className="flex flex-1 flex-col pt-16 lg:flex-none lg:pb-8 lg:pt-0">
          <AuthIntro
            icon={<MailSentMark />}
            eyebrow="Enlace enviado"
            title="Revisa tu correo"
            description={
              <>
                Si existe una cuenta asociada a <b className="break-all text-text-primary">{email}</b>, te enviamos un enlace para
                restablecer tu contraseña. Revisa también la carpeta de spam.
              </>
            }
          />
        </div>
        <AuthActions>
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link to="/login">Volver a ingresar</Link>
          </Button>
        </AuthActions>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout aside={<PromiseAside />} back={{ to: '/login', label: 'Volver a ingresar', title: 'Ingresar' }}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 pt-6 lg:flex-none lg:pt-0">
        <AuthIntro
          iconMobileOnly
          icon={
            <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-hairline bg-panel-2 text-spark">
              <KeyRound size={26} aria-hidden="true" />
            </span>
          }
          eyebrow="Recuperación"
          title="Recupera tu contraseña"
          description="Ingresa tu correo y te enviaremos un enlace para crear una nueva."
        />

        <Field
          id="email"
          label="Correo"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nombre@correo.com"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? ERROR_ID : undefined}
        />

        <AuthError id={ERROR_ID} message={error} />

        <AuthActions>
          <Button type="submit" variant="cta" size="lg" disabled={loading} className="w-full">
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </Button>
          <p className="text-center font-body text-[15px] text-text-faint">
            ¿La recordaste?{' '}
            <Link to="/login" className="font-bold text-steel hover:underline">
              Ingresa
            </Link>
          </p>
        </AuthActions>
      </form>
    </AuthLayout>
  )
}
