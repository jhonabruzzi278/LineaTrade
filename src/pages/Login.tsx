import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { hasPendingQuizAnswers } from '../lib/traderQuizStorage'

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

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', data.user.id)
      .single()
    setLoading(false)

    if (profileError) {
      setError(getErrorMessage(profileError))
      return
    }

    if (hasPendingQuizAnswers()) {
      navigate('/ia-trader')
      return
    }
    navigate(profile.onboarding_done ? '/dashboard' : '/onboarding')
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="relative max-w-md mx-auto px-6 pt-20">
        <div className="hero-aura left-1/2 -translate-x-1/2 -top-8 w-[360px] h-[260px]" aria-hidden="true" />
        <div className="relative rounded-sm border border-hairline bg-gradient-to-b from-panel-2 to-panel p-8 shadow-elevated">
        <p className="font-mono text-[13px] text-signal mb-4">acceso</p>
        <h1 className="font-display text-[30px] text-text-primary mb-2">Ingresar</h1>
        <p className="font-body text-[15px] text-text-muted mb-8">
          Continúa tu registro.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="font-body text-[13px] text-text-muted">
                Contraseña
              </label>
              <Link
                to="/recuperar"
                className="font-body text-[13px] text-text-faint hover:text-text-muted transition-colors"
              >
                ¿La olvidaste?
              </Link>
            </div>
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

          {error && <p className="font-body text-[13px] text-loss">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal disabled:hover:shadow-none"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
        </div>

        <p className="font-body text-[14px] text-text-muted mt-6 text-center">
          ¿No tienes cuenta?{' '}
          <Link to="/registro" className="text-signal hover:text-signal-dim transition-colors">
            Créala aquí
          </Link>
        </p>
      </main>
    </div>
  )
}
