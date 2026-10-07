import { BarChart3, Home, Menu, NotebookPen, Plus, type LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { activeAreaKey } from './navConfig'

interface Tab {
  key: string
  label: string
  to: string
  icon: LucideIcon
}

const TABS: Tab[] = [
  { key: 'inicio', label: 'Inicio', to: '/dashboard', icon: Home },
  { key: 'journal', label: 'Journal', to: '/historial', icon: NotebookPen },
  { key: 'analisis', label: 'Análisis', to: '/reporte', icon: BarChart3 },
  { key: 'mas', label: 'Más', to: '/mas', icon: Menu },
]

function TabLink({ tab, active }: { tab: Tab; active: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      to={tab.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 w-14 flex-col items-center justify-center gap-[3px] font-body text-[10px] font-semibold',
        active ? 'text-steel' : 'text-text-faint',
      )}
    >
      <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
      {tab.label}
    </Link>
  )
}

// Barra inferior móvil (debajo de lg): Inicio · Journal · [+] · Análisis · Más.
// El botón central registra un trade, la acción principal del producto.
export function TabBar() {
  const { pathname } = useLocation()
  const current = activeAreaKey(pathname)
  // "Más" agrupa lo que no tiene pestaña propia: Noticias, Academia y Cuenta.
  const activeKey = current === 'noticias' || current === 'academia' ? 'mas' : current

  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-3.5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 flex h-16 items-center justify-around rounded-[18px] border border-hairline bg-panel-2 shadow-elevated lg:hidden"
    >
      <TabLink tab={TABS[0]} active={activeKey === TABS[0].key} />
      <TabLink tab={TABS[1]} active={activeKey === TABS[1].key} />
      <Link to="/nuevo-trade" aria-label="Registrar trade" className="cta flex h-[50px] w-[50px] items-center justify-center rounded-xl">
        <Plus className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
      </Link>
      <TabLink tab={TABS[2]} active={activeKey === TABS[2].key} />
      <TabLink tab={TABS[3]} active={activeKey === TABS[3].key} />
    </nav>
  )
}
