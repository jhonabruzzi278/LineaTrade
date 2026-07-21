import { Link } from 'react-router-dom'

// Header para las pantallas autenticadas (Dashboard, Historial, Detalle de Trade, etc.).
// Distinto del <Nav/> público a propósito: acá nunca van "Ingresar"/"Crear cuenta". Los
// flujos de wizard (Onboarding, NuevoTrade) no usan este header — usan <WizardLayout/>,
// que es intencionalmente sin navegación.
//
// Deliberadamente solo wordmark: toda la navegación vive en <AppFloatingNav/>, la
// píldora flotante estilo Aceternity que se posiciona centrada DENTRO de esta misma
// banda sticky (ver el top-1 en AppFloatingNav). Por eso el texto del wordmark solo
// aparece en lg+: debajo de eso la píldora centrada (~490px con nombres en sm+,
// ~260px solo íconos en mobile) invadiría el texto — queda el ícono solo, misma
// lección 375px que ya obligó a esconder el wordmark en la versión anterior del header.
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
          <span className="hidden lg:inline font-display text-[15px] tracking-tight text-text-primary">
            lineatrade
          </span>
        </Link>
      </div>
    </header>
  )
}
