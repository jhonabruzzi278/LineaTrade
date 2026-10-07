import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { BrandMark } from './shell/BrandMark'
import { ThemeToggle } from './ThemeToggle'
import { buttonVariants } from './ui/button'

const SECTION_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#academia', label: 'Academia' },
  { href: '#planes', label: 'Planes' },
] as const

const SECTION_LINK_CLASS = 'inline-flex min-h-11 items-center px-1 font-body text-[14px] font-medium text-text-faint transition-colors hover:text-text-primary'

// Encabezado de las páginas públicas (landing, privacidad, eliminar cuenta).
// Escritorio: marca, secciones de la landing, ingresar y crear cuenta. Móvil:
// marca, ingresar y un menú desplegable con las secciones.
export function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)
  // Fuera de la landing las secciones viven en "/", no en la página actual.
  const anchorBase = useLocation().pathname === '/' ? '' : '/'

  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  return (
    <header className="landing-nav sticky top-0 z-30 border-b border-hairline bg-ink/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 lg:h-[72px] lg:px-10">
        <BrandMark to="/" />
        <nav aria-label="Secciones" className="hidden items-center gap-6 lg:flex">
          {SECTION_LINKS.map((link) => (
            <a key={link.href} href={anchorBase + link.href} className={SECTION_LINK_CLASS}>{link.label}</a>
          ))}
        </nav>
        <div className="flex items-center gap-1 lg:gap-2.5">
          <ThemeToggle />
          <Link to="/login" className="inline-flex min-h-11 items-center px-2.5 font-body text-[14px] font-semibold text-text-primary hover:text-steel">
            Ingresar
          </Link>
          <Link to="/registro" className={`${buttonVariants({ variant: 'default', size: 'default' })} hidden lg:inline-flex`}>
            Crear cuenta
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-publico"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-text-primary hover:bg-panel lg:hidden"
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav id="menu-publico" aria-label="Menú" className="border-t border-hairline bg-ink px-5 pb-5 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {SECTION_LINKS.map((link) => (
              <li key={link.href}>
                <a href={anchorBase + link.href} onClick={() => setMenuOpen(false)} className="flex min-h-12 items-center border-b border-hairline font-body text-[15px] font-semibold text-text-primary">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link to="/registro" className={`${buttonVariants({ variant: 'default', size: 'lg' })} mt-4 w-full`}>
            Crear cuenta gratis
          </Link>
        </nav>
      )}
    </header>
  )
}
