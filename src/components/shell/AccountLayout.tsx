import { ChevronLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { cn } from '@/lib/utils'

interface AccountSection {
  to: string
  label: string
  kicker: string
  title: string
  lead: string
  /** Solo visible (y alcanzable) para superadmin. */
  adminOnly?: boolean
  /** Contenido a todo el ancho disponible en vez del máximo de 860px. */
  wide?: boolean
}

// Zona "Cuenta": cuatro pantallas de usuario más Admin. El encabezado vive aquí
// (no en cada página) para que el subnav lateral y el título compartan la misma
// estructura que los diseños `Cta-*`/`Pln-*`/`Adm-*`.
const ACCOUNT_SECTIONS: AccountSection[] = [
  {
    to: '/perfil',
    label: 'Perfil',
    kicker: 'cuenta',
    title: 'Perfil',
    lead: 'Tu foto, tus datos y cómo quieres usar LineaTrade.',
  },
  {
    to: '/sistema',
    label: 'Sistema',
    kicker: 'cuenta',
    title: 'Sistema',
    lead: 'Tus reglas, objetivos y estrategias. Son tu referencia personal para operar con método.',
  },
  {
    to: '/configuracion/ia',
    label: 'Configuración de IA',
    kicker: 'cuenta',
    title: 'Configuración de IA',
    lead: 'Elige con qué IA funcionan el Coach, los Insights y la lectura de capturas.',
  },
  {
    to: '/planes',
    label: 'Plan y facturación',
    kicker: 'cuenta',
    title: 'Plan y facturación',
    lead: 'Tu plan, tus límites y tu suscripción en un solo lugar.',
  },
  {
    to: '/admin',
    label: 'Admin',
    kicker: 'administración',
    title: 'Panel de sistema',
    lead: 'Salud del producto de un vistazo. Solo lo ves tú; cada consulta queda en el registro de auditoría.',
    adminOnly: true,
    wide: true,
  },
]

function sectionForPath(pathname: string): AccountSection | undefined {
  return ACCOUNT_SECTIONS.find((s) => pathname === s.to || pathname.startsWith(`${s.to}/`))
}

// Ruta-layout de la cuenta. Escritorio: subnav de 200px a la izquierda y el
// contenido a la derecha (máx. 860px). Móvil: solo el contenido, con el
// retorno "← Más" porque estas pantallas cuelgan de la pestaña Más.
export function AccountLayout() {
  const { pathname } = useLocation()
  const { role } = useAuth()
  const isAdmin = role === 'superadmin'
  const sections = ACCOUNT_SECTIONS.filter((s) => !s.adminOnly || isAdmin)
  const current = sectionForPath(pathname)

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-4 lg:pb-12 lg:pt-8">
      <Link
        to="/mas"
        className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-body text-[14px] font-semibold text-text-faint hover:text-text-primary lg:hidden"
      >
        <ChevronLeft className="h-[18px] w-[18px]" aria-hidden="true" />
        Más
      </Link>

      {current && (
        <header className="mb-4 mt-1 lg:mb-6 lg:mt-0">
          <p className="label-mono">{current.kicker}</p>
          <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary lg:text-[32px]">{current.title}</h1>
          <p className="mt-2.5 hidden max-w-[620px] font-body text-[15px] leading-relaxed text-text-faint lg:block">{current.lead}</p>
        </header>
      )}

      <div className="lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-9">
        <nav aria-label="Cuenta" className="sticky top-6 hidden flex-col gap-0.5 lg:flex">
          {sections.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center rounded-lg px-3.5 font-body text-[14px] font-semibold transition-colors',
                  isActive
                    ? 'bg-panel-2 text-text-primary shadow-[inset_3px_0_0_var(--color-signal)]'
                    : 'text-text-faint hover:bg-panel hover:text-text-primary',
                )
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <div className={cn('flex min-w-0 flex-col gap-4 lg:gap-[18px]', !current?.wide && 'lg:max-w-[860px]')}>
          <Outlet />
        </div>
      </div>
    </main>
  )
}
