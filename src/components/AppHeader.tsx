import { Link } from 'react-router-dom'

// Header para las pantallas autenticadas (Dashboard, Historial, Detalle de Trade, etc.).
// Distinto del <Nav/> público a propósito: acá nunca van "Ingresar"/"Crear cuenta". Los
// flujos de wizard (Onboarding, NuevoTrade) no usan este header — usan <WizardLayout/>,
// que es intencionalmente sin navegación.
//
// Solo wordmark: toda la navegación vive en <AppFloatingNav/>, la barra flotante
// inferior (ver floating-navbar.tsx) — no comparte banda con este header, así que el
// wordmark ya no necesita esconderse en mobile (a diferencia de una versión anterior,
// cuando la píldora vivía centrada DENTRO de esta misma banda sticky).
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-ink/80 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <Link to="/dashboard" className="flex items-center gap-2 w-fit">
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
          <span className="font-display text-[15px] tracking-tight text-text-primary">
            lineatrade
          </span>
        </Link>
      </div>
    </header>
  )
}
