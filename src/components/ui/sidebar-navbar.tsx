// Contraparte de escritorio de FloatingNav (ver floating-navbar.tsx) — mismos
// navItems primarios (fuente única en hooks/useNavItems.tsx), pero acá además tiene
// dos modos: colapsado (píldora vertical solo-íconos, el look original) y expandido
// (panel con etiquetas + una segunda sección "Herramientas" con los módulos que antes
// no vivían en ninguna navegación global — Backtesting, Scanner, Coach, IA Trader,
// Sistema, Configuración IA, Admin). Solo visible desde `lg:` (1024px);
// AppFloatingNav.tsx decide cuál de las dos presentaciones (esta o FloatingNav)
// mostrar según el breakpoint, nunca las dos pisándose.
//
// El estado expandido/colapsado vive en useSidebar() (lib/sidebar.tsx), no acá local
// — las páginas que reservan espacio a la izquierda (lg:pl-24/lg:pl-80) necesitan leer
// el mismo estado, así que tiene que ser compartido, no un useState de este componente.
//
// Forma deliberadamente distinta entre modos: colapsado sigue siendo `rounded-full`
// (la píldora de siempre, una sola affordance: "esto es un ícono"). Expandido pasa a
// `rounded-sm` — la misma esquina que usa el resto de las tarjetas/paneles de la app
// (MetricCard, ExtendedStatsSection, etc.) porque ahora contiene texto y secciones,
// no solo íconos — ver "Design system" en CLAUDE.md.
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useSidebar } from '../../lib/sidebar'
import { useSidebarModules } from '../../hooks/useSidebarModules'
import type { FloatingNavItem } from './floating-navbar'

function SidebarLink({ item, showLabel }: { item: FloatingNavItem; showLabel: boolean }) {
  return (
    <NavLink
      to={item.link}
      aria-label={item.name}
      title={showLabel ? undefined : item.name}
      className={({ isActive }) =>
        cn(
          'relative flex items-center rounded-sm transition-colors duration-200',
          showLabel ? 'gap-3 px-3 py-2.5' : 'justify-center w-11 h-11 rounded-full mx-auto',
          item.emphasized
            ? 'bg-signal text-ink hover:bg-signal-dim'
            : isActive
              ? 'text-signal bg-signal/10'
              : 'text-text-faint hover:text-text-primary hover:bg-panel/70',
        )
      }
    >
      {({ isActive }) => (
        <>
          {item.isAvatar ? (
            <span
              className={cn(
                'shrink-0 rounded-full transition-shadow duration-200',
                isActive && 'ring-1 ring-signal/70 ring-offset-1 ring-offset-panel-2',
              )}
            >
              {item.icon}
            </span>
          ) : (
            <span className="shrink-0">{item.icon}</span>
          )}
          {showLabel && <span className="font-body text-[13px] truncate">{item.name}</span>}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }: { children: string }) {
  return <p className="font-mono text-[10px] text-text-faint tracking-wide px-3 mt-4 mb-1.5 first:mt-0">{children}</p>
}

export const SidebarNav = ({ navItems, className }: { navItems: FloatingNavItem[]; className?: string }) => {
  const { expanded, toggle } = useSidebar()
  const toolItems = useSidebarModules()

  if (!expanded) {
    return (
      <div
        className={cn(
          'fixed left-4 top-1/2 -translate-y-1/2 z-[5000] flex flex-col items-center gap-1 rounded-full border border-hairline bg-panel-2/95 backdrop-blur-md shadow-card px-2 py-3 transition-all duration-200',
          className,
        )}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label="Expandir menú"
          title="Expandir menú"
          className="flex items-center justify-center w-11 h-11 rounded-full text-text-faint hover:text-signal hover:bg-panel/70 transition-colors duration-200"
        >
          <ChevronsRight className="h-[18px] w-[18px]" />
        </button>
        <div className="w-6 h-px bg-hairline my-1" />
        {navItems.map((item, idx) => (
          <SidebarLink key={`collapsed-${idx}`} item={item} showLabel={false} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'fixed left-4 top-4 bottom-4 z-[5000] flex flex-col w-64 rounded-sm border border-hairline bg-panel-2/95 backdrop-blur-md shadow-card overflow-y-auto transition-all duration-200',
        className,
      )}
    >
      <div className="flex items-center justify-between px-3 pt-3 pb-1 shrink-0">
        <span className="font-mono text-[10px] text-text-faint tracking-wide">menú</span>
        <button
          type="button"
          onClick={toggle}
          aria-label="Colapsar menú"
          title="Colapsar menú"
          className="flex items-center justify-center w-8 h-8 rounded-sm text-text-faint hover:text-signal hover:bg-panel/70 transition-colors duration-200"
        >
          <ChevronsLeft className="h-[16px] w-[16px]" />
        </button>
      </div>

      <div className="px-2 pb-3">
        <SectionLabel>Principal</SectionLabel>
        <div className="space-y-0.5">
          {navItems.map((item, idx) => (
            <SidebarLink key={`primary-${idx}`} item={item} showLabel />
          ))}
        </div>

        <SectionLabel>Herramientas</SectionLabel>
        <div className="space-y-0.5">
          {toolItems.map((item, idx) => (
            <SidebarLink key={`tool-${idx}`} item={item} showLabel />
          ))}
        </div>
      </div>
    </div>
  )
}
