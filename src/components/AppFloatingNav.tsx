import { useNavItems } from '../hooks/useNavItems'
import { FloatingNav } from './ui/floating-navbar'
import { SidebarNav } from './ui/sidebar-navbar'

// Navegación primaria de la app. Debajo de `lg:` (1024px): la píldora
// horizontal flotante inferior de siempre (FloatingNav), estilo app móvil,
// se oculta al scrollear hacia abajo. Desde `lg:`: una píldora vertical fija
// en el borde izquierdo (SidebarNav) — un pill inferior centrado en una
// pantalla de escritorio ancha se ve fuera de lugar (no fue diseñado para
// eso, ver floating-navbar.tsx). Ambas leen los mismos navItems
// (hooks/useNavItems.tsx) para que íconos/rutas/estado activo nunca diverjan
// entre las dos presentaciones.
export function AppFloatingNav() {
  const navItems = useNavItems()

  return (
    <>
      <div className="lg:hidden">
        <FloatingNav navItems={navItems} />
      </div>
      <div className="hidden lg:block">
        <SidebarNav navItems={navItems} />
      </div>
    </>
  )
}
