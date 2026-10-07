import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  Bot,
  Lightbulb,
  Newspaper,
  Sliders,
  Sparkles,
  Target,
} from 'lucide-react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { useSidebar } from '../lib/sidebar'
import { cn } from '@/lib/utils'

interface ToolLink {
  name: string
  description: string
  to: string
  icon: ReactNode
}

const ANALYSIS_TOOLS: ToolLink[] = [
  { name: 'Reporte', description: 'Rachas, drawdown y curva de capital.', to: '/reporte', icon: <BarChart3 /> },
  { name: 'Insights', description: 'Patrones encontrados en tu historial.', to: '/insights', icon: <Lightbulb /> },
]

const WORKFLOW_TOOLS: ToolLink[] = [
  { name: 'Coach IA', description: 'Consulta tus patrones y decisiones.', to: '/coach', icon: <Bot /> },
  { name: 'IA Trader', description: 'Construye tu perfil y plan de trading.', to: '/ia-trader', icon: <Sparkles /> },
  { name: 'Mi sistema', description: 'Objetivos, reglas y estrategias.', to: '/sistema', icon: <Target /> },
  { name: 'Noticias', description: 'Contexto de mercado seleccionado.', to: '/noticias', icon: <Newspaper /> },
  { name: 'Configuración IA', description: 'Proveedor, modelo y clave propia.', to: '/configuracion/ia', icon: <Sliders /> },
]

function ToolSection({ title, items }: { title: string; items: ToolLink[] }) {
  return (
    <section className="mb-10">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-text-faint mb-2">{title}</h2>
      <nav className="border-y border-hairline divide-y divide-hairline">
        {items.map((item, index) => (
          <Link
            key={item.to}
            to={item.to}
            className="group grid grid-cols-[40px_1fr_auto] items-center gap-3 py-4 reveal-up"
            style={{ animationDelay: `${Math.min(index, 5) * 45}ms` }}
          >
            <span className="flex h-10 w-10 items-center justify-center text-text-faint [&_svg]:h-[18px] [&_svg]:w-[18px] transition-colors group-hover:text-signal">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block font-body text-[14px] text-text-primary">{item.name}</span>
              <span className="block font-body text-[12px] text-text-faint mt-0.5">{item.description}</span>
            </span>
            <span className="font-mono text-[13px] text-text-faint transition-all group-hover:text-signal group-hover:translate-x-1" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </nav>
    </section>
  )
}

export default function Herramientas() {
  const { expanded } = useSidebar()

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        className={cn(
          'max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
        <header className="mb-10 reveal-up">
          <p className="font-mono text-[13px] text-signal mb-2">módulos</p>
          <h1 className="font-display text-[28px] text-text-primary">Herramientas</h1>
          <p className="font-body text-[14px] text-text-muted mt-2 max-w-xl">
            Profundiza cuando lo necesites. Tu operación diaria sigue en el dashboard.
          </p>
        </header>

        <ToolSection title="Análisis" items={ANALYSIS_TOOLS} />
        <ToolSection title="Plan y contexto" items={WORKFLOW_TOOLS} />
      </main>
      <AppFloatingNav />
    </div>
  )
}
