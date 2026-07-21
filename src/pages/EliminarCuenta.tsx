import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
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
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="relative max-w-md mx-auto px-6 pt-20 pb-24">
        <p className="font-mono text-[13px] text-signal mb-4">cuenta</p>
        <h1 className="font-display text-[28px] text-text-primary mb-2">Eliminar cuenta</h1>
        <p className="font-body text-[15px] text-text-muted mb-8">
          Solicitá la eliminación permanente de tu cuenta de LineaTrade y de todos los datos asociados.
        </p>

        {done ? (
          <div className="rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated">
            <p className="font-body text-[15px] text-text-primary mb-4">
              Tu cuenta y todos tus datos fueron eliminados de forma permanente.
            </p>
            <Link to="/" className="font-body text-[14px] text-signal hover:text-signal-dim transition-colors">
              Volver al inicio
            </Link>
          </div>
        ) : !authLoading && !user ? (
          <form
            onSubmit={handleLogin}
            className="rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated space-y-5"
          >
            <p className="font-body text-[13px] text-text-muted">
              Iniciá sesión para confirmar que sos vos quien solicita la eliminación.
            </p>
            <div>
              <label htmlFor="email" className="font-body text-[13px] text-text-muted block mb-2">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@correo.com"
                className="w-full bg-ink/50 border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
              />
            </div>
            <div>
              <label htmlFor="password" className="font-body text-[13px] text-text-muted block mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full bg-ink/50 border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
              />
            </div>
            {loginError && <p className="font-body text-[13px] text-loss">{loginError}</p>}
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loggingIn ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <div className="rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated space-y-6">
            <p className="font-body text-[13px] text-text-faint break-all">
              Cuenta: <span className="text-text-muted">{user?.email ?? email}</span>
            </p>

            <div>
              <p className="font-body text-[14px] text-text-primary mb-2">Se elimina permanentemente:</p>
              <ul className="font-body text-[13px] text-text-muted space-y-1 list-disc list-inside">
                <li>Tu perfil y toda la configuración de tu cuenta</li>
                <li>Todas tus operaciones (trades) registradas y su historial</li>
                <li>Imágenes de trades y tu foto de perfil</li>
                <li>Comentarios, objetivos, reglas y estrategias</li>
                <li>Tu configuración de IA, incluida cualquier clave BYOK guardada</li>
                <li>Tus planes de IA Trader generados</li>
                <li>Tu cuenta de acceso (correo y contraseña)</li>
              </ul>
            </div>

            <div>
              <p className="font-body text-[14px] text-text-primary mb-2">Se conserva:</p>
              <p className="font-body text-[13px] text-text-muted">
                Únicamente registros de auditoría de seguridad exigidos por motivos de cumplimiento, ya
                anonimizados — dejan de estar vinculados a tu cuenta o identidad.
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="font-body text-[13px] text-text-muted block mb-2">
                Escribí <span className="text-loss font-medium">{CONFIRM_WORD}</span> para confirmar
              </label>
              <input
                id="confirm"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full bg-ink/50 border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary focus:outline-none focus:border-loss transition-colors"
              />
            </div>

            {deleteError && <p className="font-body text-[13px] text-loss">{deleteError}</p>}

            <button
              type="button"
              disabled={confirmText !== CONFIRM_WORD || deleting}
              onClick={() => void handleDelete()}
              className="w-full flex items-center justify-center gap-2 font-body text-[14px] font-medium px-5 py-3 rounded-sm border border-loss/40 text-loss transition-colors duration-200 hover:bg-loss/10 hover:border-loss disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              {deleting ? 'Eliminando...' : 'Eliminar mi cuenta y todos mis datos'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
