import { History, Home, Newspaper, Plus, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { FloatingNav } from './ui/floating-navbar'

// Navegación primaria de la app: el FloatingNav estilo Aceternity (píldora
// flotante centrada que se oculta al scrollear hacia abajo y reaparece al subir).
// Reemplaza al <BottomNav/> anterior. Muestra solo ÍCONOS en todas las
// pantallas (las palabras se retiraron a pedido del usuario — el nombre de cada
// destino queda en aria-label/title dentro de floating-navbar.tsx).
//
// `top-1` (en vez del top-10 default) ancla la píldora dentro de la banda del
// <AppHeader/> sticky (~56px): a top-10 flotaría sobre el título de cada página
// cuando está visible, y las páginas tendrían que reservar ~120px de clearance.
//
// "Salir" no navega manualmente: signOut() voltea el user del AuthProvider y
// <ProtectedRoute> redirige solo — ver la nota en CLAUDE.md sobre la race que
// causaba el navigate('/') explícito.
const ICON_CLASS = 'h-4 w-4 text-neutral-500 dark:text-white'

const NAV_ITEMS = [
  { name: 'Dashboard', link: '/dashboard', icon: <Home className={ICON_CLASS} /> },
  { name: 'Historial', link: '/historial', icon: <History className={ICON_CLASS} /> },
  { name: 'Nuevo trade', link: '/nuevo-trade', icon: <Plus className={ICON_CLASS} /> },
  { name: 'Noticias', link: '/noticias', icon: <Newspaper className={ICON_CLASS} /> },
  { name: 'Perfil', link: '/perfil', icon: <User className={ICON_CLASS} /> },
]

export function AppFloatingNav() {
  return (
    <FloatingNav
      navItems={NAV_ITEMS}
      buttonLabel="Salir"
      onButtonClick={() => void supabase.auth.signOut()}
      className="top-1"
    />
  )
}
