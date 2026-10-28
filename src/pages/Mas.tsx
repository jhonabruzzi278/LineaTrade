import { BarChart3, ChevronRight, Compass, CreditCard, GraduationCap, Landmark, Newspaper, ShieldCheck, Sparkles, Target, User, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getInitials } from '../components/Avatar'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { useAuth } from '../lib/auth'
import { PageHeader } from '../components/ui/page-header'

interface MenuItem {
  label: string
  to: string
  icon: LucideIcon
  hint?: string
  /** Pantalla diseñada pero aún no construida: no se muestra. */
  soon?: boolean
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

function buildGroups(isAdmin: boolean): MenuGroup[] {
  const groups: MenuGroup[] = [
    {
      title: 'Aprender',
      items: [
        { label: 'Academia', to: '/academia', icon: GraduationCap },
        { label: 'Noticias', to: '/noticias', icon: Newspaper },
      ],
    },
    { title: 'Análisis', items: [
      { label: 'IA Trader', to: '/ia-trader', icon: BarChart3 },
      { label: 'Fondeo Tracker', to: '/fondeo', icon: Landmark },
      { label: 'Simulador de fondeo', to: '/simulador', icon: BarChart3 },
      { label: 'Linea Pilot', to: '/pilot', icon: Compass },
    ] },
    {
      title: 'Cuenta',
      items: [
        { label: 'Perfil', to: '/perfil', icon: User },
        { label: 'Sistema', to: '/sistema', icon: Target, hint: 'reglas y objetivos' },
        { label: 'Configuración de IA', to: '/configuracion/ia', icon: Sparkles },
        { label: 'Plan y facturación', to: '/planes', icon: CreditCard },
        ...(isAdmin ? [{ label: 'Admin', to: '/admin', icon: ShieldCheck }] : []),
      ],
    },
  ]
  return groups
}

function MenuRow({ item }: { item: MenuItem }) {
  const Icon = item.icon
  return (
    <Link
      to={item.to}
      className="flex min-h-14 items-center gap-3.5 border-t border-hairline px-4 font-body text-[15px] font-semibold text-text-primary transition-colors first:border-t-0 hover:bg-panel-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal"
    >
      <Icon className="h-[22px] w-[22px] text-steel" aria-hidden="true" />
      {item.label}
      {item.hint && <span className="num ml-auto text-[12px] font-normal text-text-faint">{item.hint}</span>}
      <ChevronRight className={`h-[18px] w-[18px] text-text-faint ${item.hint ? '' : 'ml-auto'}`} aria-hidden="true" />
    </Link>
  )
}

// Menú "Más" de móvil: reúne lo que no tiene pestaña propia en la barra
// inferior (aprendizaje, cuenta, herramientas secundarias).
export default function Mas() {
  const { user, avatarUrl, role } = useAuth()
  const { planKey, byFeature } = useEntitlements(user?.id)
  const used = useAiUsageToday(user?.id)
  const ai = byFeature.get('ai_actions')
  const planLabel = planKey === 'pro' ? 'Plan Pro' : planKey === 'byok' ? 'Plan BYOK' : 'Plan Free'
  const usage = planKey === 'free' && ai?.hardLimit != null && used !== null ? ` · ${used} de ${ai.hardLimit} usos de IA hoy` : ''
  const groups = buildGroups(role === 'superadmin')

  return (
    <main className="mx-auto max-w-2xl px-5 pb-28 pt-6 lg:pb-12 lg:pt-10">
      <PageHeader kicker="Cuenta y herramientas" title="Más" lead="Accesos a aprendizaje, análisis y preferencias de tu cuenta." />

      <Link to="/perfil" className="mt-5 flex min-h-[72px] items-center gap-3.5 rounded-xl border border-hairline bg-panel px-4 py-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-panel-2 font-display text-[16px] text-steel">
          {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user?.email)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-body text-[16px] font-bold text-text-primary">{user?.email}</span>
          <span className="num mt-0.5 block text-[11px] text-text-faint">
            {planLabel}
            {usage}
          </span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] text-text-faint" aria-hidden="true" />
      </Link>

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="label-mono px-1 pb-2">{group.title}</h2>
            <div className="overflow-hidden rounded-xl border border-hairline bg-panel">
              {group.items.filter((item) => !item.soon).map((item) => (
                <MenuRow key={item.to} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="num mt-8 text-center text-[11px] text-text-faint">
        LineaTrade ·{' '}
        <Link to="/privacidad" className="text-steel hover:underline">
          Privacidad
        </Link>
      </p>
    </main>
  )
}
