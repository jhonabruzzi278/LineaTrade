import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

export function Nav() {
  return (
    <header className="landing-nav sticky top-0 z-30 px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-hairline bg-ink/85 px-4 py-2 backdrop-blur-xl sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M2 14 L7 8 L11 12 L18 4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-signal transition-[stroke-width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:[stroke-width:2]"
            />
          </svg>
          <span className="font-display text-[15px] tracking-tight text-text-primary">
            lineatrade
          </span>
        </Link>
        <nav aria-label="Navegación principal" className="flex items-center gap-1 sm:gap-4">
          <a href="#como-funciona" className="hidden min-h-11 items-center text-sm text-text-muted hover:text-text-primary lg:inline-flex">Plataforma</a>
          <a href="#academia" className="hidden min-h-11 items-center text-sm text-text-muted hover:text-text-primary lg:inline-flex">Academia</a>
          <a href="#planes" className="hidden min-h-11 items-center text-sm text-text-muted hover:text-text-primary lg:inline-flex">Planes</a>
          <ThemeToggle />
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-text-muted transition-colors duration-150 hover:text-text-primary"
          >
            Ingresar
          </Link>
          <Link
            to="/registro"
            className="hidden min-h-11 items-center rounded-full bg-signal px-4 py-2 text-sm font-semibold text-white transition-[background-color,transform] duration-150 hover:bg-signal-dim active:scale-[0.96] sm:inline-flex"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  )
}
