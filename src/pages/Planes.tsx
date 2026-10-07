import { useState } from 'react'
import { Check, LockKeyhole } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { AppHeader } from '../components/AppHeader'
import { useEntitlements } from '../hooks/useEntitlements'
import { useAuth } from '../lib/auth'
import { useSidebar } from '../lib/sidebar'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

const planLabels: Record<string, string> = { free: 'Free', pro: 'Pro', byok: 'BYOK' }
const featureLabels: Record<string, string> = {
  journal: 'Journal y dashboard',
  academy: 'Academia',
  ai_actions: 'Acciones de IA',
  news_briefs: 'Briefs de mercado',
  advanced_insights: 'Insights avanzados',
  advanced_alerts: 'Alertas inteligentes',
}

function formatLimit(limit: number | null, period: string | null) {
  if (limit === null) return 'Sin límite fijo'
  const periodLabel = period === 'day' ? 'día' : period === 'month' ? 'mes' : 'total'
  return `${limit} por ${periodLabel}`
}

export default function Planes() {
  const { user } = useAuth()
  const { expanded } = useSidebar()
  const { planKey, items, loading, error } = useEntitlements(user?.id)
  const [searchParams] = useSearchParams()
  const [startingCheckout, setStartingCheckout] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const flowResult = searchParams.get('flow')

  async function startSubscription() {
    setStartingCheckout(true)
    setCheckoutError(null)
    const { data, error: requestError } = await supabase.functions.invoke<{ redirectUrl: string }>('flow-start-subscription')
    if (requestError || !data?.redirectUrl) {
      setCheckoutError('No pudimos abrir Flow. Inténtalo nuevamente.')
      setStartingCheckout(false)
      return
    }
    window.location.assign(data.redirectUrl)
  }

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className={cn('mx-auto max-w-5xl px-5 pb-28 pt-8 transition-[padding-left] duration-200 sm:px-6 lg:pb-12 lg:pt-10', expanded ? 'lg:pl-80' : 'lg:pl-24')}>
        <header className="max-w-2xl border-b border-hairline pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal">Cuenta y límites</p>
          <h1 className="mt-3 text-balance font-display text-[30px] font-medium tracking-[-0.03em] text-text-primary sm:text-[36px]">Tu plan LineaTrade</h1>
          <p className="mt-3 text-pretty font-body text-[14px] leading-6 text-text-muted">Tus permisos se calculan en el servidor y se aplican igual en web, PWA y aplicación móvil.</p>
        </header>

        <section aria-labelledby="current-plan" className="grid gap-8 border-b border-hairline py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">Plan actual</p>
            <h2 id="current-plan" className="mt-2 font-display text-[32px] font-medium text-signal">{loading ? 'Consultando…' : planLabels[planKey] ?? planKey}</h2>
            {error && <p role="alert" className="mt-3 font-body text-[12px] text-loss">{error}</p>}
          </div>

          <div className="divide-y divide-hairline border-y border-hairline">
            {items.filter((item) => item.featureKey !== 'dashboard').map((item) => (
              <div key={item.featureKey} className="flex min-h-14 items-center justify-between gap-4 py-3">
                <span className="flex items-center gap-3 font-body text-[13px] text-text-primary">
                  {item.enabled ? <Check className="h-4 w-4 text-gain" /> : <LockKeyhole className="h-4 w-4 text-text-faint" />}
                  {featureLabels[item.featureKey] ?? item.featureKey}
                </span>
                <span className="font-mono text-[11px] tabular-nums text-text-faint">{item.enabled ? formatLimit(item.hardLimit, item.period) : 'No incluido'}</span>
              </div>
            ))}
          </div>
        </section>

        {flowResult && (
          <p role="status" className={`mt-6 border-l-2 px-4 py-3 font-body text-[13px] ${flowResult === 'success' ? 'border-gain bg-gain/5 text-gain' : 'border-loss bg-loss/5 text-loss'}`}>
            {flowResult === 'success' ? 'Suscripción creada. Tu periodo Pro de prueba ya está activo.' : 'Flow no pudo completar el registro. No se realizó ningún cargo.'}
          </p>
        )}

        <section className="py-8" aria-labelledby="upgrade-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-faint">Siguiente nivel</p>
              <h2 id="upgrade-title" className="mt-2 font-display text-[22px] font-medium text-text-primary">Pro amplía análisis, insights y alertas</h2>
              <p className="mt-3 max-w-xl font-body text-[13px] leading-6 text-text-muted">La estructura de permisos ya está activa. El pago se habilitará después de conectar Flow y verificar compra, renovación, cancelación y fallo de pago.</p>
            </div>
            <button type="button" disabled={loading || startingCheckout || planKey !== 'free'} onClick={() => void startSubscription()} className="inline-flex min-h-11 items-center justify-center rounded-sm bg-signal px-5 py-3 font-body text-[13px] font-semibold text-on-signal transition-[background-color,transform,opacity] duration-150 hover:bg-signal-dim active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-panel disabled:text-text-faint disabled:opacity-70">
              {startingCheckout ? 'Abriendo Flow…' : planKey === 'free' ? 'Probar Pro 31 días' : 'Plan Pro activo'}
            </button>
          </div>
          {checkoutError && <p role="alert" className="mt-4 font-body text-[12px] text-loss">{checkoutError}</p>}
        </section>
      </main>
      <AppFloatingNav />
    </div>
  )
}
