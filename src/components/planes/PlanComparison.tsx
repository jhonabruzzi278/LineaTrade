import { Check, Minus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AccountSection } from '../account/AccountSection'
import { describePlanCell, type PlanEntitlementRow, type PlanKey } from '../../lib/planSummary'
import { cn } from '@/lib/utils'

interface FeatureRow {
  label: string
  keys: string[]
  /** Texto cuando la función está incluida sin límite numérico. */
  unlimited: string | null
}

// Orden y nombres de la tabla. «Journal y dashboard» agrupa las dos claves de
// entitlement que hoy comparten política (journal, dashboard).
const FEATURES: FeatureRow[] = [
  { label: 'Journal y dashboard', keys: ['journal', 'dashboard'], unlimited: null },
  { label: 'Academia', keys: ['academy'], unlimited: null },
  { label: 'Acciones de IA', keys: ['ai_actions'], unlimited: 'Sin límite' },
  { label: 'Briefs de mercado', keys: ['news_briefs'], unlimited: null },
  { label: 'Insights avanzados', keys: ['advanced_insights'], unlimited: null },
  { label: 'Alertas inteligentes', keys: ['advanced_alerts'], unlimited: null },
]

const PLANS: { key: PlanKey; label: string }[] = [
  { key: 'free', label: 'Free' },
  { key: 'pro', label: 'Pro' },
  { key: 'byok', label: 'BYOK' },
]

interface PlanComparisonProps {
  entitlements: PlanEntitlementRow[]
  currentPlan: PlanKey
  title: string
}

function Cell({ row, unlimited }: { row: PlanEntitlementRow | undefined; unlimited: string | null }) {
  const cell = describePlanCell(row, unlimited)
  if (cell.kind === 'excluded') {
    return (
      <span className="inline-flex items-center gap-1.5 text-text-faint">
        <Minus className="h-4 w-4" aria-hidden="true" />
        <span className="text-[12px]">No incluido</span>
      </span>
    )
  }
  if (cell.detail) return <span className="num text-[13px] text-text-muted">{cell.detail}</span>
  return (
    <>
      <Check className="h-[18px] w-[18px] text-steel" aria-hidden="true" />
      <span className="sr-only">Incluido</span>
    </>
  )
}

// Comparativo Free / Pro / BYOK con los límites reales de plan_entitlements.
// El plan del usuario va marcado con texto («Tu plan») además del acento.
export function PlanComparison({ entitlements, currentPlan, title }: PlanComparisonProps) {
  const find = (plan: PlanKey, keys: string[]) => {
    for (const key of keys) {
      const row = entitlements.find((e) => e.plan_key === plan && e.feature_key === key)
      if (row) return row
    }
    return undefined
  }

  return (
    <AccountSection title={title}>
      <div className="-mx-1 overflow-x-auto px-1">
        <table className="w-full min-w-[420px] border-collapse font-body text-[13px]">
          <thead>
            <tr>
              <th scope="col" className="w-[38%] pb-2 text-left">
                <span className="sr-only">Función</span>
              </th>
              {PLANS.map((plan) => (
                <th key={plan.key} scope="col" className="label-mono pb-2 text-left font-medium">
                  {plan.label}
                  {plan.key === currentPlan && <span className="ml-1.5 text-steel">· tu plan</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((feature) => (
              <tr key={feature.label} className="border-t border-hairline">
                <th scope="row" className="py-3 pr-3 text-left font-semibold text-text-primary">
                  {feature.label}
                </th>
                {PLANS.map((plan) => (
                  <td key={plan.key} className={cn('py-3 pr-2 align-middle', plan.key === currentPlan && 'text-text-primary')}>
                    <Cell row={find(plan.key, feature.keys)} unlimited={feature.unlimited} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3.5 font-body text-[12px] text-text-faint">
        BYOK no se compra: se activa solo cuando configuras tu propia clave en{' '}
        <Link to="/configuracion/ia" className="font-semibold text-steel hover:underline">
          Configuración de IA
        </Link>
        .
      </p>
    </AccountSection>
  )
}
