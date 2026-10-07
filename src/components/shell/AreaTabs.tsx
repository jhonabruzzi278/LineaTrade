import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { NAV_AREAS, activeAreaKey, isLeafActive, visibleChildren } from './navConfig'

// En móvil las áreas con varias pantallas (Journal, Análisis, Academia) no
// caben como pestañas propias: esta fila de chips permite cambiar entre ellas.
export function AreaTabs() {
  const { pathname } = useLocation()
  const key = activeAreaKey(pathname)
  const area = NAV_AREAS.find((a) => a.key === key)
  const leaves = area ? visibleChildren(area) : []
  if (!area || leaves.length < 2) return null

  return (
    <nav aria-label={area.label} className="sticky top-0 z-30 border-b border-hairline bg-ink/90 px-4 py-2 backdrop-blur-md lg:hidden">
      <ul className="flex gap-2 overflow-x-auto">
        {leaves.map((leaf) => {
          const active = isLeafActive(pathname, leaf, leaves)
          return (
            <li key={leaf.to} className="shrink-0">
              <Link
                to={leaf.to}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-10 items-center rounded-full border px-4 font-body text-[13px] font-semibold',
                  active ? 'border-signal bg-signal/15 text-text-primary' : 'border-hairline text-text-faint',
                )}
              >
                {leaf.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
