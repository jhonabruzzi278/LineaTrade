import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { AreaTabs } from './AreaTabs'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'

// Pantallas de lectura/foco que llevan su propia barra de acción: ahí no se
// muestran las pestañas inferiores.
const FOCUS_PREFIXES = ['/academia/lecciones/']

interface AppLayoutProps {
  /** Sin sesión, renderiza solo el contenido (rutas públicas con shell opcional). */
  optional?: boolean
}

// Marco de la app autenticada: barra lateral en escritorio, barra inferior en
// móvil y un único lugar donde vive el espacio reservado para ambas. Las
// pantallas ya no dibujan su propia navegación ni su padding lateral.
export function AppLayout({ optional = false }: AppLayoutProps) {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  if (optional && (loading || !user)) return <Outlet />

  const showTabs = !FOCUS_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-60">
        {showTabs && <AreaTabs />}
        <Outlet />
      </div>
      {showTabs && <TabBar />}
    </div>
  )
}
