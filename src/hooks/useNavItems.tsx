import { History, Home, Newspaper, Plus } from 'lucide-react'
import { getInitials } from '../components/Avatar'
import { useAuth } from '../lib/auth'
import type { FloatingNavItem } from '../components/ui/floating-navbar'

const ICON_CLASS = 'h-[18px] w-[18px]'
// Más grande que el resto de los íconos (18px) a propósito: es la foto real
// del usuario, no un glifo genérico, y se pidió que destaque más en la barra.
const AVATAR_SIZE = 'w-[28px] h-[28px]'

// Fuente única de los items de navegación primaria — consumida tanto por la
// pill flotante inferior (mobile/tablet, FloatingNav) como por el riel lateral
// de escritorio (DesktopSidebarNav). Antes vivía inline dentro de
// AppFloatingNav.tsx; se extrajo acá para que ambas presentaciones (íconos,
// rutas, estado activo, emphasized/isAvatar) nunca puedan divergir entre sí.
export function useNavItems(): FloatingNavItem[] {
  const { user, avatarUrl } = useAuth()

  return [
    { name: 'Dashboard', link: '/dashboard', icon: <Home className={ICON_CLASS} /> },
    { name: 'Historial', link: '/historial', icon: <History className={ICON_CLASS} /> },
    {
      name: 'Nuevo trade',
      link: '/nuevo-trade',
      icon: <Plus className={ICON_CLASS} />,
      emphasized: true,
    },
    { name: 'Noticias', link: '/noticias', icon: <Newspaper className={ICON_CLASS} /> },
    {
      name: 'Perfil',
      link: '/perfil',
      isAvatar: true,
      icon: avatarUrl ? (
        <img src={avatarUrl} alt="" className={`${AVATAR_SIZE} rounded-full object-cover`} />
      ) : (
        <span
          className={`${AVATAR_SIZE} rounded-full bg-panel border border-hairline flex items-center justify-center font-mono text-[10px] text-signal`}
        >
          {getInitials(user?.email)}
        </span>
      ),
    },
  ]
}
