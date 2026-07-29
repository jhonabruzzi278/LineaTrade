import { History, Home, Newspaper, Plus } from 'lucide-react'
import { getInitials } from './Avatar'
import { useAuth } from '../lib/auth'
import { FloatingNav } from './ui/floating-navbar'

// Navegación primaria de la app: una barra flotante inferior estilo app
// móvil (ícono activo resaltado en `signal`, "Nuevo trade" con fondo lleno
// como acción primaria) que se oculta al scrollear hacia abajo y reaparece
// al subir. Reemplaza al <BottomNav/> anterior. Muestra solo ÍCONOS en todas
// las pantallas (las palabras se retiraron a pedido del usuario — el nombre
// de cada destino queda en aria-label/title dentro de floating-navbar.tsx).
//
// El ícono de "Perfil" es la foto de avatar real del usuario (o sus
// iniciales si no subió una), no un ícono genérico — es la forma más rápida
// de reconocer "esta es mi cuenta" en una barra de solo-íconos. Por eso
// NAV_ITEMS se arma DENTRO del componente (ya no es un array module-level
// estático): necesita `avatarUrl`/`user` de useAuth().
//
// No hay botón de "Salir" acá — ver el punto 2 en floating-navbar.tsx: cerrar
// sesión ahora es una acción explícita dentro de Perfil, no un ícono más en
// la navegación global.
const ICON_CLASS = 'h-[18px] w-[18px]'
// Más grande que el resto de los íconos (18px) a propósito: es la foto real
// del usuario, no un glifo genérico, y se pidió que destaque más en la barra.
const AVATAR_SIZE = 'w-[28px] h-[28px]'

export function AppFloatingNav() {
  const { user, avatarUrl } = useAuth()

  const navItems = [
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

  return <FloatingNav navItems={navItems} />
}
