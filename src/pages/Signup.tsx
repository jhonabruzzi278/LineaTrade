import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.')
      return
    }
    // TODO: reemplazar por supabase.auth.signUp() cuando conectemos el backend real
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-ink">
        <Nav />
        <main className="max-w-md mx-auto px-6 pt-24 text-center">
          <p className="font-mono text-[13px] text-signal mb-4">cuenta creada</p>
          <h1 className="font-display text-[26px] text-text-primary mb-3">
            Revisa tu correo
          </h1>
          <p className="font-body text-[15px] text-text-muted leading-relaxed">
            Te enviamos un enlace de confirmación a <span className="text-text-primary">{email}</span>.
            Confírmalo para completar tu perfil y registrar tu primer trade.
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="max-w-md mx-auto px-6 pt-20">
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
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@correo.com"
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
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
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />
          </div>

          {error && (
            <p className="font-body text-[13px] text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
          >
            Crear cuenta
          </button>
        </form>

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
