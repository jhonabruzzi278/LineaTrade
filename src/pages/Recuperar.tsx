import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav'

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    // TODO: reemplazar por supabase.auth.resetPasswordForEmail() cuando conectemos el backend real
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-ink">
        <Nav />
        <main className="max-w-md mx-auto px-6 pt-24 text-center">
          <p className="font-mono text-[13px] text-signal mb-4">enlace enviado</p>
          <h1 className="font-display text-[26px] text-text-primary mb-3">Revisa tu correo</h1>
          <p className="font-body text-[15px] text-text-muted leading-relaxed">
            Si existe una cuenta asociada a{' '}
            <span className="text-text-primary">{email}</span>, te enviamos un enlace para
            restablecer tu contraseña. Revisa también la carpeta de spam.
          </p>
          <p className="font-body text-[14px] text-text-muted mt-8 text-center">
            <Link to="/login" className="text-signal hover:text-signal-dim transition-colors">
              Volver a ingresar
            </Link>
          </p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <Nav />
      <main className="max-w-md mx-auto px-6 pt-20">
        <p className="font-mono text-[13px] text-signal mb-4">recuperación</p>
        <h1 className="font-display text-[30px] text-text-primary mb-2">Recuperar contraseña</h1>
        <p className="font-body text-[15px] text-text-muted mb-8">
          Ingresa tu correo y te enviaremos un enlace para restablecerla.
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

          <button
            type="submit"
            className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
          >
            Enviar enlace
          </button>
        </form>

        <p className="font-body text-[14px] text-text-muted mt-6 text-center">
          ¿Recordaste tu contraseña?{' '}
          <Link to="/login" className="text-signal hover:text-signal-dim transition-colors">
            Ingresa aquí
          </Link>
        </p>
      </main>
    </div>
  )
}
