import { History, Home, LogOut, Newspaper, Plus, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FloatingNav } from './ui/floating-navbar'

// Navegación primaria de la app: una barra flotante inferior estilo app
// móvil (ícono activo resaltado en `signal`, "Nuevo trade" con fondo lleno
// como acción primaria) que se oculta al scrollear hacia abajo y reaparece
// al subir. Reemplaza al <BottomNav/> anterior. Muestra solo ÍCONOS en todas
// las pantallas (las palabras se retiraron a pedido del usuario — el nombre
// de cada destino queda en aria-label/title dentro de floating-navbar.tsx).
//
// "Salir" no navega manualmente: signOut() voltea el user del AuthProvider y
// <ProtectedRoute> redirige solo — ver la nota en CLAUDE.md sobre la race que
// causaba el navigate('/') explícito.
const ICON_CLASS = 'h-[18px] w-[18px]'

const NAV_ITEMS = [
  { name: 'Dashboard', link: '/dashboard', icon: <Home className={ICON_CLASS} /> },
  { name: 'Historial', link: '/historial', icon: <History className={ICON_CLASS} /> },
  {
    name: 'Nuevo trade',
    link: '/nuevo-trade',
    icon: <Plus className={ICON_CLASS} />,
    emphasized: true,
  },
  { name: 'Noticias', link: '/noticias', icon: <Newspaper className={ICON_CLASS} /> },
  { name: 'Perfil', link: '/perfil', icon: <User className={ICON_CLASS} /> },
]

export function AppFloatingNav() {
  return (
    <FloatingNav
      navItems={NAV_ITEMS}
      buttonLabel="Salir"
      buttonIcon={<LogOut className={ICON_CLASS} />}
      onButtonClick={() => void supabase.auth.signOut()}
    />
  )
}
