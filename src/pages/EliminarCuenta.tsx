import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { AuthError } from '../components/auth/AuthError'
import { PasswordField } from '../components/auth/PasswordField'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field, FIELD_CLASS } from '../components/ui/field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { getErrorMessage, getFunctionErrorMessage } from '../lib/errors'

// Requerido por la política de eliminación de cuentas de Google Play: una URL
// pública (esta página) donde cualquier usuario pueda solicitar la
// eliminación de su cuenta sin depender solo de un email a soporte —
// `Privacidad.tsx` §5 linkea acá. No está envuelta en <ProtectedRoute>, mismo
// motivo que /ia-trader: tiene que funcionar para alguien sin sesión activa
// (o sin la app instalada), así que el login vive dentro de esta misma
// página en vez de redirigir a /login y perder el contexto de la solicitud.
const CONFIRM_WORD = 'ELIMINAR'
const LOGIN_ERROR_ID = 'eliminar-login-error'
const DELETE_ERROR_ID = 'eliminar-delete-error'

const DELETED_ITEMS = [
  'Tu perfil y toda la configuración de tu cuenta',
  'Todas tus operaciones (trades) registradas y su historial',
  'Imágenes de trades y tu foto de perfil',
  'Comentarios, objetivos, reglas y estrategias',
  'Tu configuración de IA, incluida cualquier clave BYOK guardada',
  'Tus planes de IA Trader generados',
  'Tu cuenta de acceso (correo y contraseña)',
]

export default function EliminarCuenta() {
  const { user, loading: authLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setLoginError(null)
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoggingIn(false)
    if (error) setLoginError(getErrorMessage(error))
  }

  async function handleDelete() {
    setDeleteError(null)
    setDeleting(true)
    const { error } = await supabase.functions.invoke('delete-account')
    setDeleting(false)
    if (error) {
      setDeleteError(await getFunctionErrorMessage(error))
      return
    }
    // La sesión ya quedó invalidada del lado del servidor (el usuario dejó de
    // existir) — esto solo limpia el estado local, no hace falta manejar un
    // eventual error de signOut.
    await supabase.auth.signOut().catch(() => {})
    setDone(true)
  }

  return (
    <div className="min-h-screen bg-ink text-text-primary">
      <Nav />
      <main className="mx-auto max-w-md px-5 pb-24 pt-10 lg:pt-16">
        <p className="label-mono text-steel">Cuenta</p>
        <h1 className="mt-2 text-balance font-display text-[30px] leading-[1.05] lg:text-[38px]">Eliminar cuenta</h1>
        <p className="mb-8 mt-3 text-pretty font-body text-[15px] leading-relaxed text-text-faint">
          Solicita la eliminación permanente de tu cuenta de LineaTrade y de todos los datos asociados.
        </p>

        {done ? (
          <Card className="space-y-4 p-6">
            <p className="font-body text-[15px] text-text-primary">
              Tu cuenta y todos tus datos fueron eliminados de forma permanente.
            </p>
            <Link to="/" className="inline-flex min-h-11 items-center font-body text-[14px] font-bold text-steel hover:underline">
              Volver al inicio
            </Link>
          </Card>
        ) : !authLoading && !user ? (
          <Card as="section" className="p-6">
            <form onSubmit={handleLogin} className="space-y-5">
              <p className="font-body text-[13px] text-text-faint">
                Inicia sesión para confirmar que eres tú quien solicita la eliminación.
              </p>
              <Field
                id="email"
                label="Correo"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
              />
              <PasswordField
                id="password"
                label="Contraseña"
                autoComplete="current-password"
                required
                value={password}
                onValueChange={setPassword}
                placeholder="Tu contraseña"
                errorId={loginError ? LOGIN_ERROR_ID : undefined}
              />
              <AuthError id={LOGIN_ERROR_ID} message={loginError} />
              <Button type="submit" variant="cta" size="lg" disabled={loggingIn} className="w-full">
                {loggingIn ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
          </Card>
        ) : (
          <Card as="section" className="space-y-6 p-6">
            <p className="break-all font-body text-[13px] text-text-faint">
              Cuenta: <span className="text-text-muted">{user?.email ?? email}</span>
            </p>

            <div>
              <p className="mb-2 font-body text-[14px] font-bold text-text-primary">Se elimina permanentemente:</p>
              <ul className="list-inside list-disc space-y-1 font-body text-[13px] text-text-muted">
                {DELETED_ITEMS.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>

            <div>
              <p className="mb-2 font-body text-[14px] font-bold text-text-primary">Se conserva:</p>
              <p className="font-body text-[13px] text-text-muted">
                Únicamente registros de auditoría de seguridad exigidos por motivos de cumplimiento, ya
                anonimizados — dejan de estar vinculados a tu cuenta o identidad.
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="mb-1.5 block font-body text-[12px] font-semibold text-text-faint">
                Escribe <span className="font-bold text-loss">{CONFIRM_WORD}</span> para confirmar
              </label>
              <input
                id="confirm"
                type="text"
                autoComplete="off"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>

            <AuthError id={DELETE_ERROR_ID} message={deleteError} />

            <Button
              type="button"
              variant="danger"
              size="lg"
              disabled={confirmText !== CONFIRM_WORD || deleting}
              onClick={() => void handleDelete()}
              className="w-full whitespace-normal text-center"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi cuenta y todos mis datos'}
            </Button>
          </Card>
        )}
      </main>
    </div>
  )
}
