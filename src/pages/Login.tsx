import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PromiseAside } from '../components/auth/AuthAsides'
import { AuthError } from '../components/auth/AuthError'
import { AuthActions, AuthIntro, AuthLayout } from '../components/auth/AuthLayout'
import { PasswordField } from '../components/auth/PasswordField'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { resolvePostAuthPath } from '../lib/postAuthRedirect'

const ERROR_ID = 'login-error'

function LoginMark() {
  return (
    <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-ink bg-signal shadow-[4px_4px_0_var(--color-pop)]">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-on-signal)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 17l5-6 4 3 6-8 3 3" />
      </svg>
    </span>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setLoading(false)
      setError(getErrorMessage(signInError))
      return
    }

    try {
      navigate(await resolvePostAuthPath(data.user.id))
    } catch (resolveError: unknown) {
      setError(getErrorMessage(resolveError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout aside={<PromiseAside />}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 pt-12 lg:flex-none lg:pt-0">
        <AuthIntro
          iconMobileOnly
          icon={<LoginMark />}
          eyebrow="Acceso"
          title="Bienvenido de vuelta"
          description="Continúa tu registro donde lo dejaste."
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
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onValueChange={setPassword}
          placeholder="Tu contraseña"
          errorId={error ? ERROR_ID : undefined}
          labelAside={
            <Link
              to="/recuperar"
              className="-my-3 inline-flex min-h-11 items-center font-body text-[13px] font-semibold text-steel hover:underline"
            >
              ¿La olvidaste?
            </Link>
          }
        />

        <AuthError id={ERROR_ID} message={error} />

        <AuthActions>
          <Button type="submit" variant="cta" size="lg" disabled={loading} className="w-full">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
          <p className="text-center font-body text-[15px] text-text-faint">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="font-bold text-steel hover:underline">
              Créala gratis
            </Link>
          </p>
        </AuthActions>
      </form>
    </AuthLayout>
  )
}
