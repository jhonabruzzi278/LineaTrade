import { Link } from 'react-router-dom'

// Marca de LineaTrade: cuadrado azul con sombra dura amarilla y una línea de
// tendencia. `to` apunta a la pantalla de inicio del usuario autenticado.
export function BrandMark({ to = '/dashboard', className = '' }: { to?: string; className?: string }) {
  return (
    <Link to={to} aria-label="LineaTrade, ir al inicio" className={`flex items-center gap-2.5 ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-signal shadow-[2px_2px_0_var(--color-pop)]">
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--color-on-signal)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 17l5-6 4 3 6-8 3 3" />
        </svg>
      </span>
      <span className="font-display text-[17px] text-text-primary">LineaTrade</span>
    </Link>
  )
}
