import { BarChart3, Bot, History as ReplayIcon, Radar, ShieldCheck, Sliders, Sparkles, Target } from 'lucide-react'
import { useAuth } from '../lib/auth'
import type { FloatingNavItem } from '../components/ui/floating-navbar'

const ICON_CLASS = 'h-[18px] w-[18px]'

// Módulos "más complejos" del producto — hasta ahora solo alcanzables desde 4
// tarjetas sueltas en /dashboard, sin ningún lugar de navegación global (ver
// CLAUDE.md "Navegación redesigned"). Solo alimenta la sección "Herramientas" del
// sidebar de escritorio expandido (ui/sidebar-navbar.tsx) — la barra móvil de 5
// íconos (useNavItems.tsx) se queda exactamente como está, a propósito: no hay
// espacio para 12 íconos en una píldora inferior de teléfono.
export function useSidebarModules(): FloatingNavItem[] {
  const { role } = useAuth()

  const items: FloatingNavItem[] = [
    { name: 'Reporte', link: '/reporte', icon: <BarChart3 className={ICON_CLASS} /> },
    { name: 'Market Replay', link: '/backtesting', icon: <ReplayIcon className={ICON_CLASS} /> },
    { name: 'Scanner', link: '/escaner', icon: <Radar className={ICON_CLASS} /> },
    { name: 'Coach IA', link: '/coach', icon: <Bot className={ICON_CLASS} /> },
    { name: 'IA Trader', link: '/ia-trader', icon: <Sparkles className={ICON_CLASS} /> },
    { name: 'Sistema', link: '/sistema', icon: <Target className={ICON_CLASS} /> },
    { name: 'Configuración IA', link: '/configuracion/ia', icon: <Sliders className={ICON_CLASS} /> },
  ]

  if (role === 'superadmin') {
    items.push({ name: 'Admin', link: '/admin', icon: <ShieldCheck className={ICON_CLASS} /> })
  }

  return items
}
