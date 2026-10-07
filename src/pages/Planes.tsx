import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CircleAlert, CircleCheck } from 'lucide-react'
import { AccountRow, AccountSection } from '../components/account/AccountSection'
import { PlanComparison } from '../components/planes/PlanComparison'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { ProgressBar } from '../components/ui/progress-bar'
import { Tag } from '../components/ui/tag'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { useAuth } from '../lib/auth'
import { fetchAiUsageThisMonth, fetchLatestSubscription, fetchPlanEntitlements } from '../lib/billing'
import { summarizeSubscription, type PlanEntitlementRow, type PlanKey, type SubscriptionRow } from '../lib/planSummary'
import { supabase } from '../lib/supabase'
import { cn } from '@/lib/utils'

const PLAN_NAMES: Record<PlanKey, string> = { free: 'Free', pro: 'Pro', byok: 'BYOK' }
const TRIAL_DAYS = 31

function isPlanKey(value: string): value is PlanKey {
  return value === 'free' || value === 'pro' || value === 'byok'
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

interface BillingData {
  entitlements: PlanEntitlementRow[]
  subscription: SubscriptionRow | null
  monthlyUsage: number | null
}

// Carga lo que no trae useEntitlements: la tabla comparativa de todos los
// planes, la suscripción y el uso del mes. Si algo falla, la pantalla sigue
// mostrando el plan actual (que viene del servidor por otro camino).
function useBillingData(userId: string | undefined, loadMonthly: boolean) {
  const [data, setData] = useState<BillingData>({ entitlements: [], subscription: null, monthlyUsage: null })
  const [loading, setLoading] = useState(Boolean(userId))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!userId) return
    let active = true
    Promise.allSettled([
      fetchPlanEntitlements(),
      fetchLatestSubscription(),
      loadMonthly ? fetchAiUsageThisMonth() : Promise.resolve(null),
    ]).then(([entitlements, subscription, monthly]) => {
      if (!active) return
      setData({
        entitlements: entitlements.status === 'fulfilled' ? entitlements.value : [],
        subscription: subscription.status === 'fulfilled' ? subscription.value : null,
        monthlyUsage: monthly.status === 'fulfilled' ? monthly.value : null,
      })
      setFailed(entitlements.status === 'rejected' || subscription.status === 'rejected')
      setLoading(false)
    })
    return () => {
      active = false
    }
  }, [userId, loadMonthly])

  return { ...data, loading, failed }
}

export default function Planes() {
  const { user } = useAuth()
  const { planKey: rawPlanKey, byFeature, loading: planLoading, error: planError } = useEntitlements(user?.id)
  const planKey: PlanKey = isPlanKey(rawPlanKey) ? rawPlanKey : 'free'
  const billing = useBillingData(user?.id, planKey !== 'free')
  const usedToday = useAiUsageToday(user?.id)
  const [searchParams] = useSearchParams()
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const flowResult = searchParams.get('flow')

  const ai = byFeature.get('ai_actions')
  const summary = summarizeSubscription(billing.subscription)
  const isTrial = summary?.statusLabel === 'En prueba'

  async function startSubscription() {
    setStartingCheckout(true)
    setCheckoutError(null)
    const { data, error } = await supabase.functions.invoke<{ redirectUrl: string }>('flow-start-subscription')
    if (error || !data?.redirectUrl) {
      setCheckoutError('No pudimos abrir Flow. Inténtalo nuevamente.')
      setStartingCheckout(false)
      return
    }
    window.location.assign(data.redirectUrl)
  }

  if (planLoading) {
    return (
      <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
        <div className="h-40 animate-pulse rounded-xl bg-panel" />
        <div className="h-48 animate-pulse rounded-xl bg-panel" />
      </div>
    )
  }

  const dailyUsage = ai?.period === 'day' && ai.hardLimit !== null && usedToday !== null ? { used: usedToday, limit: ai.hardLimit } : null
  const monthlyUsage = ai?.period === 'month' && ai.hardLimit !== null && billing.monthlyUsage !== null ? { used: billing.monthlyUsage, limit: ai.hardLimit } : null
  const usage = dailyUsage ?? monthlyUsage
  const usagePeriod = dailyUsage ? 'hoy' : 'este mes'

  return (
    <>
      {planError && (
        <p role="alert" className="font-body text-[13px] text-loss">
          {planError}
        </p>
      )}

      {flowResult && (
        <div
          role="status"
          className={cn(
            'flex items-center gap-3 rounded-[10px] border px-4 py-3 font-body text-[14px]',
            flowResult === 'success' ? 'border-hairline bg-panel text-text-primary' : 'border-loss/40 bg-loss/10 text-loss',
          )}
        >
          {flowResult === 'success' ? (
            <CircleCheck className="h-[18px] w-[18px] shrink-0 text-steel" aria-hidden="true" />
          ) : (
            <CircleAlert className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          )}
          <span>
            {flowResult === 'success'
              ? 'Suscripción creada. Tu periodo Pro de prueba ya está activo.'
              : 'Flow no pudo completar el registro. No se realizó ningún cargo.'}
          </span>
        </div>
      )}

      <Card as="section" aria-label="Tu plan actual" className="lg:px-6 lg:py-[22px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-mono">Tu plan actual</p>
            <div className="mt-2 flex items-center gap-3">
              <p className="font-display text-[28px] leading-none text-text-primary lg:text-[32px]">{PLAN_NAMES[planKey]}</p>
              {summary && <Tag tone={summary.needsAttention ? 'spark' : 'brand'}>{summary.statusLabel}</Tag>}
              {!summary && planKey === 'free' && <span className="num text-[12px] text-text-faint">Sin costo</span>}
            </div>
          </div>
          {summary && planKey === 'pro' && (
            <p className="num text-right text-[12px] leading-relaxed text-text-faint">
              {isTrial && summary.trialDaysLeft !== null && (
                <>
                  Quedan {summary.trialDaysLeft} {summary.trialDaysLeft === 1 ? 'día' : 'días'}
                  <br />
                </>
              )}
              {summary.nextChargeAt && !summary.endsAtPeriodEnd && <>{isTrial ? 'Primer cobro el' : 'Próximo cobro el'} {formatLongDate(summary.nextChargeAt)}</>}
              {summary.endsAtPeriodEnd && summary.nextChargeAt && <>Termina el {formatLongDate(summary.nextChargeAt)}</>}
            </p>
          )}
        </div>

        {planKey === 'byok' && (
          <p className="mt-4 font-body text-[14px] leading-relaxed text-text-muted">
            Usas tu propia clave de IA: sin límite de acciones. Lo gestionas en{' '}
            <Link to="/configuracion/ia" className="font-semibold text-steel hover:underline">
              Configuración de IA
            </Link>
            .
          </p>
        )}

        {usage && (
          <div className="mt-[18px]">
            <div className="flex items-baseline justify-between gap-3 font-body text-[14px]">
              <span className="text-text-muted">Acciones de IA {usagePeriod}</span>
              <b className="num font-medium text-text-primary">
                {usage.used} de {usage.limit}
              </b>
            </div>
            <ProgressBar className="mt-2" value={usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0} label={`Acciones de IA ${usagePeriod}: ${usage.used} de ${usage.limit}`} />
            {dailyUsage && <p className="mt-2 font-body text-[12px] text-text-faint">Se renuevan mañana.</p>}
          </div>
        )}
      </Card>

      {planKey === 'free' && (
        <Card as="section" aria-labelledby="pro-offer" className="lg:px-6 lg:py-[22px]">
          <p className="label-mono text-steel">Pro</p>
          <h2 id="pro-offer" className="font-display mt-1.5 text-[20px] text-text-primary">
            Prueba Pro durante {TRIAL_DAYS} días
          </h2>
          <p className="mt-2 max-w-xl font-body text-[14px] leading-relaxed text-text-muted">
            Más acciones de IA, briefs de mercado, insights avanzados y alertas inteligentes. Registras tu medio de pago en Flow y no se cobra durante la prueba. Después se cobra mes a mes; Flow te muestra el valor antes de confirmar.
          </p>
          <div className="mt-4">
            <Button type="button" variant="cta" size="lg" disabled={startingCheckout} onClick={() => void startSubscription()} className="w-full sm:w-auto">
              {startingCheckout ? 'Abriendo Flow…' : `Probar Pro ${TRIAL_DAYS} días`}
            </Button>
          </div>
          {checkoutError && (
            <p role="alert" className="mt-3 font-body text-[13px] text-loss">
              {checkoutError}
            </p>
          )}
        </Card>
      )}

      {planKey === 'pro' && billing.subscription && summary && (
        <AccountSection title="Pago y suscripción">
          <AccountRow title="Medio de pago" description="Tarjeta registrada en Flow." />
          {summary.nextChargeAt && (
            <AccountRow
              title={summary.endsAtPeriodEnd ? 'Fin del periodo' : isTrial ? 'Primer cobro' : 'Próximo cobro'}
              description={<span className="num">{formatLongDate(summary.nextChargeAt)}</span>}
            />
          )}
          <AccountRow
            title="Cancelar suscripción"
            description="Todavía no se puede cancelar desde la app. Conservas Pro hasta que termine el periodo de prueba o el ya pagado."
          />
        </AccountSection>
      )}

      {billing.failed && (
        <p role="note" className="font-body text-[12px] text-text-faint">
          No pudimos cargar todos los datos de tu suscripción. Tu plan y tus límites sí están al día.
        </p>
      )}

      {!billing.loading && billing.entitlements.length > 0 && (
        <PlanComparison title={planKey === 'free' ? 'Qué incluye cada plan' : 'Lo que incluye tu plan'} entitlements={billing.entitlements} currentPlan={planKey} />
      )}

      <p className="font-body text-[12px] text-text-faint">Tus permisos se calculan en el servidor y se aplican igual en la web, la PWA y la app móvil.</p>
    </>
  )
}
