import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

// Header para las pantallas autenticadas (Dashboard, Historial, Detalle de Trade).
// Distinto del <Nav/> público a propósito: acá van los links internos y "salir",
// nunca "Ingresar"/"Crear cuenta". Los flujos de wizard (Onboarding, NuevoTrade) no
// usan este header — usan <WizardLayout/>, que es intencionalmente sin navegación.
//
// El wordmark se oculta bajo sm: a propósito — con 4 elementos de nav (Dashboard,
// Historial, + Trade, Salir) más el wordmark completo, el header se desbordaba en
// mobile (375px), cortando "Salir" fuera de la pantalla. El producto es mobile-first,
// así que el layout angosto manda.
export function AppHeader() {
  const location = useLocation()
  const { role } = useAuth()

  // No hace falta navegar manualmente: signOut() dispara onAuthStateChange,
  // AuthProvider actualiza user a null, y <ProtectedRoute/> ya redirige a /login
  // solo con eso (ver src/components/ProtectedRoute.tsx).
  function handleSignOut() {
    void supabase.auth.signOut()
  }

  function linkClass(path: string) {
    const active = location.pathname === path
    const base =
      'relative font-body text-[13px] transition-colors after:absolute after:-bottom-[6px] after:left-0 after:h-px after:bg-signal after:transition-[right] after:duration-200'
    return active
      ? `${base} text-text-primary after:right-0`
      : `${base} text-text-muted hover:text-text-primary after:right-full hover:after:right-0`
  }

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-ink/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M2 14 L7 8 L11 12 L18 4"
              fill="none"
              stroke="#E3A94A"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline font-display text-[15px] tracking-tight text-text-primary">
            lineatrade
          </span>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6">
          <Link to="/dashboard" className={linkClass('/dashboard')}>
            Dashboard
          </Link>
          <Link to="/historial" className={linkClass('/historial')}>
            Historial
          </Link>
          {role === 'superadmin' && (
            <Link to="/admin" className={linkClass('/admin')}>
              Admin
            </Link>
          )}
          <Link
            to="/nuevo-trade"
            className="font-body text-[13px] px-3 py-1.5 sm:px-4 sm:py-2 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow whitespace-nowrap"
          >
            + Trade
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="font-body text-[12px] text-text-faint hover:text-text-muted transition-colors shrink-0"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
