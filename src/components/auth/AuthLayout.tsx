import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { BrandMark } from '../shell/BrandMark'
import { ThemeToggle } from '../ThemeToggle'

interface AuthLayoutProps {
  children: ReactNode
  // Panel de apoyo, solo escritorio (>= lg). En móvil no se dibuja.
  aside?: ReactNode
  // Enlace de regreso del encabezado móvil (flecha + texto). Sin él, el
  // encabezado móvil solo muestra el selector de tema.
  back?: { to: string; label: string; title?: string }
}

// Marco de las pantallas de acceso (ingresar, registro, recuperar, correo
// enviado). Escritorio: dos columnas — formulario centrado a la izquierda y un
// panel de apoyo a la derecha. Móvil: una columna a pantalla completa; el
// formulario empuja sus acciones al pie con `mt-auto` (ver `AuthActions`).
export function AuthLayout({ children, aside, back }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh bg-ink text-text-primary lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh min-w-0 flex-col lg:px-12 lg:py-7">
        <header className="flex items-center gap-1 px-3 py-2 lg:hidden">
          {back && (
            <>
              <Link
                to={back.to}
                aria-label={back.label}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-text-primary hover:bg-panel"
              >
                <ChevronLeft size={22} aria-hidden="true" />
              </Link>
              <span className="font-display text-base">{back.title ?? 'LineaTrade'}</span>
            </>
          )}
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <header className="hidden items-center justify-between lg:flex">
          <BrandMark to="/" />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col lg:justify-center lg:py-12">
          <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col px-5 pb-7 lg:flex-none lg:px-0 lg:pb-0">
            {children}
          </div>
        </main>
      </div>
      {aside && <aside className="hidden p-6 lg:flex">{aside}</aside>}
    </div>
  )
}

interface AuthIntroProps {
  eyebrow: string
  title: string
  description: ReactNode
  // Bloque opcional sobre el título (ícono o marca) — solo móvil/escritorio por igual.
  icon?: ReactNode
  // En escritorio la marca ya está en el encabezado: el icono solo aplica a móvil.
  iconMobileOnly?: boolean
}

export function AuthIntro({ eyebrow, title, description, icon, iconMobileOnly = false }: AuthIntroProps) {
  return (
    <div>
      {icon && <div className={iconMobileOnly ? 'mb-6 lg:hidden' : 'mb-6'}>{icon}</div>}
      <p className="label-mono text-steel">{eyebrow}</p>
      <h1 className="mt-2 text-balance font-display text-[30px] leading-[1.05] lg:mt-3 lg:text-[38px]">{title}</h1>
      <p className="mt-2 text-pretty font-body text-[15px] leading-relaxed text-text-faint lg:mt-3 lg:text-base">{description}</p>
    </div>
  )
}

// Pie del formulario: en móvil queda pegado al borde inferior (mt-auto dentro
// de un formulario flex-1); en escritorio fluye a continuación de los campos.
export function AuthActions({ children }: { children: ReactNode }) {
  return <div className="mt-auto flex flex-col gap-3 pt-4 lg:mt-0 lg:pt-1">{children}</div>
}
