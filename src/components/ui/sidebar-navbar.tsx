// Contraparte de escritorio de FloatingNav (ver floating-navbar.tsx) — mismos
// navItems (fuente única en hooks/useNavItems.tsx), pero como una píldora
// vertical flotando en el borde izquierdo en vez de una píldora horizontal
// anclada abajo. Solo visible desde `lg:` (1024px); AppFloatingNav.tsx decide
// cuál de las dos presentaciones mostrar según el breakpoint, nunca las dos
// pisándose. No se oculta al scrollear (a diferencia de la pill mobile, que
// compite por espacio vertical en pantallas cortas) — en desktop hay ancho de
// sobra y no hay razón para esconderla.
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { FloatingNavItem } from './floating-navbar'

export const SidebarNav = ({ navItems, className }: { navItems: FloatingNavItem[]; className?: string }) => {
  return (
    <div
      className={cn(
        'fixed left-4 top-1/2 -translate-y-1/2 z-[5000] flex flex-col items-center gap-1 rounded-full border border-hairline bg-panel-2/95 backdrop-blur-md shadow-card px-2 py-3',
        className,
      )}
    >
      {navItems.map((navItem, idx) => (
        <NavLink
          key={`sidebar-link=${idx}`}
          to={navItem.link}
          aria-label={navItem.name}
          title={navItem.name}
          className={({ isActive }) =>
            cn(
              'relative flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-200',
              navItem.emphasized
                ? 'bg-signal text-ink hover:bg-signal-dim'
                : isActive
                  ? 'text-signal bg-signal/10'
                  : 'text-text-faint hover:text-text-primary hover:bg-panel/70',
            )
          }
        >
          {({ isActive }) =>
            navItem.isAvatar ? (
              <span
                className={cn(
                  'rounded-full transition-shadow duration-200',
                  isActive && 'ring-1 ring-signal/70 ring-offset-1 ring-offset-panel-2',
                )}
              >
                {navItem.icon}
              </span>
            ) : (
              navItem.icon
            )
          }
        </NavLink>
      ))}
    </div>
  )
}
