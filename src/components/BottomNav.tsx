import type { ReactElement } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Avatar } from './Avatar'
import { HistoryIcon, HomeIcon, NewsIcon, PlusIcon } from './icons/NavIcons'

interface NavItem {
  to: string
  label: string
  icon: (className: string) => ReactElement
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Inicio', icon: (c) => <HomeIcon className={c} /> },
  { to: '/historial', label: 'Historial', icon: (c) => <HistoryIcon className={c} /> },
  { to: '/nuevo-trade', label: 'Nuevo trade', icon: (c) => <PlusIcon className={c} /> },
  { to: '/noticias', label: 'Noticias', icon: (c) => <NewsIcon className={c} /> },
]

// Barra flotante persistente, estilo isla (Instagram/apps nativas) — reemplaza al
// FAB líquido expandible: acá los destinos están siempre visibles, no hay que
// tocar para revelarlos. Fija abajo-centro en todas las resoluciones, mobile-first
// pero también cómoda en desktop (no hace falta reposicionarla a un costado).
export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-2 rounded-full border border-hairline bg-panel-2/95 backdrop-blur-md shadow-elevated"
    >
      {NAV_ITEMS.map((item) => {
        const active = location.pathname === item.to
        return (
          <Link
            key={item.to}
            to={item.to}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 ${
              active ? 'bg-signal/15 text-signal' : 'text-text-muted hover:text-text-primary hover:bg-panel-2'
            }`}
          >
            {item.icon('w-[22px] h-[22px]')}
          </Link>
        )
      })}
      <div className="w-11 h-11 flex items-center justify-center">
        <Avatar active={location.pathname === '/perfil'} />
      </div>
    </nav>
  )
}
