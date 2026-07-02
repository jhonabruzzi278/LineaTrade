import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    // TODO: reemplazar por supabase.auth.signInWithPassword() cuando conectemos el backend real
    setError('Backend aún no conectado — esta es la vista de validación de diseño.')
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="max-w-md mx-auto px-6 pt-20">
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
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
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
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>

          {error && <p className="font-body text-[13px] text-steel">{error}</p>}

          <button
            type="submit"
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
          >
            Ingresar
          </button>
        </form>

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
