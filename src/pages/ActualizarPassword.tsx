import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

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
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
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
      <div className="min-h-screen bg-ink">
        <Nav />
        <main className="max-w-md mx-auto px-6 pt-24 text-center">
          <p className="font-mono text-[13px] text-signal mb-4">contraseña actualizada</p>
          <h1 className="font-display text-[26px] text-text-primary mb-3">Listo</h1>
          <p className="font-body text-[15px] text-text-muted leading-relaxed">
            Ya puedes ingresar con tu nueva contraseña.
          </p>
          <Link
            to="/login"
            className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors mt-8"
          >
            Ir a ingresar
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="max-w-md mx-auto px-6 pt-20">
        <p className="font-mono text-[13px] text-signal mb-4">nueva contraseña</p>
        <h1 className="font-display text-[30px] text-text-primary mb-2">Actualizar contraseña</h1>
        <p className="font-body text-[15px] text-text-muted mb-8">Elige tu nueva contraseña.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="font-body text-[13px] text-text-muted block mb-2">
              Nueva contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>

          {error && <p className="font-body text-[13px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </main>
    </div>
  )
}
