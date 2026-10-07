import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { PromiseAside } from '../components/auth/AuthAsides'
import { AuthError } from '../components/auth/AuthError'
import { AuthActions, AuthIntro, AuthLayout } from '../components/auth/AuthLayout'
import { PasswordField } from '../components/auth/PasswordField'
import { Button } from '../components/ui/button'
import { PASSWORD_MIN_LENGTH } from '../lib/passwordStrength'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

const ERROR_ID = 'actualizar-error'

// Destino del enlace de supabase.auth.resetPasswordForEmail(). Supabase detecta el
// token de recuperación en la URL y abre una sesión temporal automáticamente
// (detectSessionInUrl, activo por defecto) — updateUser() usa esa sesión.
export default function ActualizarPassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(`La contraseña necesita al menos ${PASSWORD_MIN_LENGTH} caracteres.`)
      return
    }
    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout aside={<PromiseAside />}>
        <div className="flex flex-1 flex-col pt-16 lg:flex-none lg:pb-8 lg:pt-0">
          <AuthIntro
            icon={
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border-2 border-ink bg-signal text-on-signal shadow-[4px_4px_0_var(--color-pop)]">
                <Check size={26} strokeWidth={2.6} aria-hidden="true" />
              </span>
            }
            eyebrow="Contraseña actualizada"
            title="Listo"
            description="Ya puedes ingresar con tu nueva contraseña."
          />
        </div>
        <AuthActions>
          <Button asChild variant="cta" size="lg" className="w-full">
            <Link to="/login">Ir a ingresar</Link>
          </Button>
        </AuthActions>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout aside={<PromiseAside />}>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 pt-12 lg:flex-none lg:pt-0">
        <AuthIntro
          eyebrow="Nueva contraseña"
          title="Actualiza tu contraseña"
          description="Elige una contraseña nueva para tu cuenta."
        />

        <PasswordField
          id="password"
          label="Nueva contraseña"
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
          <Button type="submit" variant="cta" size="lg" disabled={loading} className="w-full">
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </AuthActions>
      </form>
    </AuthLayout>
  )
}
