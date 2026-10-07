import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BenefitsAside } from '../components/auth/AuthAsides'
import { AuthError } from '../components/auth/AuthError'
import { AuthActions, AuthIntro, AuthLayout } from '../components/auth/AuthLayout'
import { ConfirmationSteps, MailSentMark, ResendButton } from '../components/auth/MailSent'
import { PasswordField } from '../components/auth/PasswordField'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { PASSWORD_MIN_LENGTH } from '../lib/passwordStrength'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

const ERROR_ID = 'signup-error'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña necesita al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }
    setLoading(true)
    const { error: signUpError } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (signUpError) {
      setError(getErrorMessage(signUpError))
      return
    }
    setSubmitted(true)
  }

  async function resendConfirmation(): Promise<string | null> {
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email })
    return resendError ? getErrorMessage(resendError) : null
  }

  if (submitted) {
    return (
      <AuthLayout aside={<BenefitsAside />}>
        <div className="flex flex-1 flex-col gap-7 pt-16 lg:flex-none lg:pb-7 lg:pt-0">
          <AuthIntro
            icon={<MailSentMark />}
            eyebrow="Cuenta creada"
            title="Revisa tu correo"
            description={
              <>
                Te enviamos un enlace de confirmación a <b className="break-all text-text-primary">{email}</b>.
              </>
            }
          />
          <ConfirmationSteps />
        </div>
        <AuthActions>
          <p className="text-center font-body text-[14px] text-text-faint">¿No llegó? Revisa la carpeta de spam o</p>
          <ResendButton onResend={resendConfirmation} />
          <Link to="/login" className="self-center p-2.5 font-body text-[14px] font-semibold text-steel hover:underline">
            Volver a ingresar
          </Link>
        </AuthActions>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout aside={<BenefitsAside />} back={{ to: '/', label: 'Volver al inicio' }}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 pt-2 lg:flex-none lg:pt-0">
        <AuthIntro
          eyebrow="Paso 1 de 2 · cuenta"
          title="Crea tu cuenta"
          description="Plan gratuito. Sin tarjeta y sin conectar tu bróker."
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
        />

        <PasswordField
          id="password"
          label="Contraseña"
          name="new-password"
          autoComplete="new-password"
          required
          showStrength
          value={password}
          onValueChange={setPassword}
          placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
          errorId={error ? ERROR_ID : undefined}
        />

        <AuthError id={ERROR_ID} message={error} />

        <AuthActions>
          <p className="font-body text-[12px] leading-relaxed text-text-faint">
            Al crear tu cuenta aceptas la{' '}
            <Link to="/privacidad" className="font-semibold text-steel hover:underline">
              política de privacidad
            </Link>
            . LineaTrade es una herramienta educativa y no entrega asesoría financiera.
          </p>
          <Button type="submit" variant="cta" size="lg" disabled={loading} className="w-full">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
          <p className="text-center font-body text-[15px] text-text-faint">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="font-bold text-steel hover:underline">
              Ingresa aquí
            </Link>
          </p>
        </AuthActions>
      </form>
    </AuthLayout>
  )
}
