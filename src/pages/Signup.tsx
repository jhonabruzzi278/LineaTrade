import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-ink">
        <Nav />
        <main className="relative max-w-md mx-auto px-6 pt-24">
          <div className="hero-aura left-1/2 -translate-x-1/2 -top-8 w-[360px] h-[260px]" aria-hidden="true" />
          <div className="relative rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated text-center">
            <p className="font-mono text-[13px] text-signal mb-4">cuenta creada</p>
            <h1 className="font-display text-[26px] text-text-primary mb-3">
              Revisa tu correo
            </h1>
            <p className="font-body text-[15px] text-text-muted leading-relaxed">
              Te enviamos un enlace de confirmación a <span className="text-text-primary">{email}</span>.
              Confírmalo para completar tu perfil y registrar tu primer trade.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="relative max-w-md mx-auto px-6 pt-20">
        <div className="hero-aura left-1/2 -translate-x-1/2 -top-8 w-[360px] h-[260px]" aria-hidden="true" />
        <div className="relative rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated">
        <p className="font-mono text-[13px] text-signal mb-4">entrada 000</p>
        <h1 className="font-display text-[30px] text-text-primary mb-2">Crear cuenta</h1>
        <p className="font-body text-[15px] text-text-muted mb-8">
          Registro gratuito. Sin plan de pago, sin suscripción.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="email" className="font-body text-[13px] text-text-muted block mb-2">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
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
              name="new-password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-ink/50 border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-[13px] text-loss">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal disabled:hover:shadow-none"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        </div>

        <p className="font-body text-[14px] text-text-muted mt-6 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-signal hover:text-signal-dim transition-colors">
            Ingresa aquí
          </Link>
        </p>
      </main>
    </div>
  )
}
