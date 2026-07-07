import { Link } from 'react-router-dom'

export function Nav() {
  return (
    <header className="border-b border-hairline">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
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
        <nav className="flex items-center gap-6">
          <Link
            to="/login"
            className="font-body text-[14px] text-text-muted hover:text-text-primary transition-colors"
          >
            Ingresar
          </Link>
          <Link
            to="/registro"
            className="font-body text-[14px] px-4 py-2 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
          >
            Crear cuenta
          </Link>
        </nav>
      </div>
    </header>
  )
}
