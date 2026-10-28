import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '../../lib/auth'
import { useEntitlements } from '../../hooks/useEntitlements'
import { useAiUsageToday } from '../../hooks/useAiUsageToday'
import { getInitials } from '../Avatar'
import { BrandMark } from './BrandMark'
import { ACCOUNT_PATHS, NAV_AREAS, activeAreaKey, isLeafActive, visibleChildren } from './navConfig'

const ROW = 'flex items-center gap-[11px] rounded-lg px-3 py-[9px] font-body text-[14px] font-medium transition-colors'
const ROW_ACTIVE = 'bg-panel-2 text-text-primary shadow-[inset_3px_0_0_var(--color-signal)]'
const ROW_IDLE = 'text-text-faint hover:bg-panel hover:text-text-primary'

function PlanCard() {
  const { user } = useAuth()
  const { planKey, byFeature } = useEntitlements(user?.id)
  const used = useAiUsageToday(user?.id)
  const ai = byFeature.get('ai_actions')
  const planLabel = planKey === 'pro' ? 'Plan Pro' : planKey === 'byok' ? 'Plan BYOK' : 'Plan Free'
  const showDaily = planKey === 'free' && ai?.period === 'day' && ai.hardLimit !== null && used !== null

  return (
    <div className="rounded-[10px] border border-hairline bg-panel px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-body text-[13px] font-bold text-text-primary">{planLabel}</span>
        {showDaily && (
          <span className="num text-[11px] text-text-faint">
            {used}/{ai?.hardLimit} IA hoy
          </span>
        )}
      </div>
      {planKey === 'free' && (
        <Link to="/planes" className="mt-1.5 inline-block font-body text-[13px] font-semibold text-steel hover:underline">
          Pasar a Pro →
        </Link>
      )}
    </div>
  )
}

// Barra lateral de escritorio: las áreas con subpantallas funcionan como un
// acordeón. Esto conserva el acceso a toda la navegación sin convertir la
// barra en una lista desplazable.
export function Sidebar() {
  const { pathname } = useLocation()
  const { user, avatarUrl } = useAuth()
  const current = activeAreaKey(pathname)
  const inAccount = ACCOUNT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  const [expandedArea, setExpandedArea] = useState<string | null>(current === 'mas' ? null : current)

  useEffect(() => {
    setExpandedArea(current === 'mas' ? null : current)
  }, [current])

  return (
    <aside
      aria-label="Navegación principal"
      className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col overflow-hidden border-r border-hairline bg-ink px-3.5 py-5 lg:flex"
    >
      <BrandMark className="px-3 pb-5" />
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
        {NAV_AREAS.map((area) => {
          const Icon = area.icon
          const active = current === area.key
          const children = visibleChildren(area)
          const expanded = expandedArea === area.key
          const childId = `sidebar-${area.key}-children`
          return (
            <div key={area.key} className="flex flex-col gap-0.5">
              <div className="relative">
                <NavLink
                  to={area.to}
                  aria-current={active ? 'page' : undefined}
                  className={cn(ROW, children.length > 0 && 'pr-10', active ? ROW_ACTIVE : ROW_IDLE)}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                  {area.label}
                </NavLink>
                {children.length > 0 && (
                  <button
                    type="button"
                    aria-label={`${expanded ? 'Contraer' : 'Desplegar'} ${area.label}`}
                    aria-expanded={expanded}
                    aria-controls={childId}
                    onClick={() => setExpandedArea(expanded ? null : area.key)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-text-faint transition-colors hover:bg-panel hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  >
                    <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
                  </button>
                )}
              </div>
              {expanded && children.length > 0 && (
                <div id={childId} className="flex flex-col gap-0.5 pb-1">
                  {children.map((leaf) => {
                    const leafActive = isLeafActive(pathname, leaf, children)
                    return (
                      <Link
                        key={leaf.to}
                        to={leaf.to}
                        aria-current={leafActive ? 'page' : undefined}
                        className={cn(
                          'block rounded-md py-[5px] pl-[42px] pr-3 font-body text-[13px] transition-colors',
                          leafActive ? 'font-semibold text-text-primary' : 'text-text-faint hover:text-text-primary',
                        )}
                      >
                        {leaf.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>
      <div className="mt-3 flex flex-col gap-1.5">
        <PlanCard />
        <Link to="/perfil" aria-current={inAccount ? 'page' : undefined} className={cn(ROW, 'mt-1', inAccount ? ROW_ACTIVE : ROW_IDLE)}>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-hairline bg-panel-2 font-body text-[11px] font-bold text-steel">
            {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(user?.email)}
          </span>
          Tu cuenta
        </Link>
      </div>
    </aside>
  )
}
