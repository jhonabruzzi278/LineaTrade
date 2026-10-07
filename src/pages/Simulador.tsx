import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { ProgressBar } from '../components/ui/progress-bar'

type Scenario = {
  balance: number
  target: number
  maxLoss: number
  risk: number
  winRate: number
  rewardRisk: number
  tradesPerDay: number
}

const STORAGE_KEY = 'lineatrade.funded-simulator.v1'
const DEFAULT_SCENARIO: Scenario = {
  balance: 50_000,
  target: 3_000,
  maxLoss: 2_000,
  risk: 100,
  winRate: 45,
  rewardRisk: 2,
  tradesPerDay: 3,
}

function readScenario(): Scenario {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_SCENARIO
    const value: unknown = JSON.parse(stored)
    if (!value || typeof value !== 'object') return DEFAULT_SCENARIO
    const candidate = value as Partial<Scenario>
    return Object.fromEntries(Object.keys(DEFAULT_SCENARIO).map((key) => {
      const typedKey = key as keyof Scenario
      const number = candidate[typedKey]
      return [typedKey, typeof number === 'number' && Number.isFinite(number) ? number : DEFAULT_SCENARIO[typedKey]]
    })) as Scenario
  } catch {
    return DEFAULT_SCENARIO
  }
}

function money(value: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export default function Simulador() {
  const [scenario, setScenario] = useState<Scenario>(readScenario)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scenario)) } catch { /* Storage puede estar deshabilitado. */ }
  }, [scenario])

  const result = useMemo(() => {
    const expectancyR = (scenario.winRate / 100) * scenario.rewardRisk - (1 - scenario.winRate / 100)
    const targetR = scenario.target / scenario.risk
    const lossCapacity = Math.floor(scenario.maxLoss / scenario.risk)
    const requiredTrades = expectancyR > 0 ? Math.ceil(targetR / expectancyR) : null
    const sessions = requiredTrades === null ? null : Math.ceil(requiredTrades / scenario.tradesPerDay)
    return { expectancyR, targetR, lossCapacity, requiredTrades, sessions }
  }, [scenario])

  function update<K extends keyof Scenario>(key: K, raw: string) {
    const value = Number(raw)
    if (Number.isFinite(value)) setScenario((current) => ({ ...current, [key]: value }))
  }

  const valid = scenario.balance > 0 && scenario.target > 0 && scenario.maxLoss > 0 && scenario.risk > 0 && scenario.winRate >= 0 && scenario.winRate <= 100 && scenario.rewardRisk > 0 && scenario.tradesPerDay > 0

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <PageHeader kicker="Análisis · escenarios" title="Simulador de fondeo" lead="Explora cómo se relacionan objetivo, pérdida máxima y riesgo usando las reglas que tú ingreses." actions={<Link to="/academia" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-4 font-body text-[13px] font-semibold text-text-muted hover:bg-panel hover:text-text-primary">Repasar conceptos <ArrowRight className="h-4 w-4" /></Link>} />

      <Callout className="mb-6">Este cálculo es educativo y no representa las reglas de una firma. Copia los límites vigentes desde tu proveedor y confirma sus definiciones antes de tomar decisiones.</Callout>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card as="section" aria-labelledby="scenario-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="label-mono">Configura el escenario</p><h2 id="scenario-title" className="mt-1 font-display text-[19px] text-text-primary">Parámetros de evaluación</h2></div>
            <button type="button" onClick={() => setScenario(DEFAULT_SCENARIO)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 font-body text-[12px] font-semibold text-text-faint hover:bg-panel-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"><RotateCcw className="h-3.5 w-3.5" />Restablecer</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sim-balance" label="Balance de referencia (USD)" type="number" min="1" step="1000" value={scenario.balance} onChange={(event) => update('balance', event.target.value)} />
            <Field id="sim-target" label="Objetivo de ganancia (USD)" type="number" min="1" step="100" value={scenario.target} onChange={(event) => update('target', event.target.value)} />
            <Field id="sim-max-loss" label="Pérdida máxima definida (USD)" type="number" min="1" step="100" value={scenario.maxLoss} onChange={(event) => update('maxLoss', event.target.value)} />
            <Field id="sim-risk" label="Riesgo por operación (USD)" type="number" min="1" step="25" value={scenario.risk} onChange={(event) => update('risk', event.target.value)} />
            <Field id="sim-win-rate" label="Win rate hipotético (%)" type="number" min="0" max="100" step="1" value={scenario.winRate} onChange={(event) => update('winRate', event.target.value)} />
            <Field id="sim-rr" label="Ganancia media / riesgo (R)" type="number" min="0.1" step="0.1" value={scenario.rewardRisk} onChange={(event) => update('rewardRisk', event.target.value)} />
            <Field id="sim-trades-day" label="Operaciones por sesión" type="number" min="1" step="1" value={scenario.tradesPerDay} onChange={(event) => update('tradesPerDay', event.target.value)} className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]" />
          </div>
          {!valid && <p role="alert" className="mt-4 font-body text-[12px] text-loss">Revisa los valores: deben ser positivos y el win rate debe estar entre 0 y 100.</p>}
        </Card>

        <section aria-labelledby="scenario-result" className="space-y-4">
          <Card tone="brand" className="p-5 sm:p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-75">Valor esperado hipotético</p>
            <h2 id="scenario-result" className="mt-2 font-display text-[34px] font-semibold leading-tight">{valid ? `${result.expectancyR >= 0 ? '+' : ''}${result.expectancyR.toFixed(2)}R` : '—'}</h2>
            <p className="mt-2 font-body text-[12px] leading-relaxed opacity-80">Balance de referencia {money(scenario.balance)} · por operación, según los supuestos que ingresaste.</p>
          </Card>

          <Card>
            <p className="label-mono">Distancia al objetivo</p>
            <div className="mt-3 flex items-baseline justify-between gap-4"><span className="font-display text-[22px] text-text-primary">{valid ? `${result.targetR.toFixed(1)}R` : '—'}</span><span className="font-mono text-[11px] text-text-faint">{money(scenario.target)} / {money(scenario.risk)} de riesgo</span></div>
            <ProgressBar value={valid ? Math.min(100, (scenario.risk / scenario.target) * 100) : 0} className="mt-4" label="Riesgo por operación en relación al objetivo" />
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card><p className="label-mono">Pérdidas completas</p><p className="num mt-2 text-[24px] text-text-primary">{valid ? result.lossCapacity : '—'}</p><p className="mt-1 font-body text-[11px] text-text-faint">al riesgo ingresado antes del límite</p></Card>
            <Card><p className="label-mono">Sesiones teóricas</p><p className="num mt-2 text-[24px] text-text-primary">{valid && result.sessions !== null ? `~${result.sessions}` : '—'}</p><p className="mt-1 font-body text-[11px] text-text-faint">si la expectativa es positiva</p></Card>
          </div>

          {valid && result.expectancyR <= 0 && <Callout tone="warning"><span className="inline-flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Con estos supuestos, la expectativa no es positiva. La estimación de sesiones no aplica.</span></Callout>}
          <p className="px-1 font-body text-[11px] leading-relaxed text-text-faint">Las sesiones se calculan dividiendo el objetivo por la expectativa matemática; no estiman probabilidad ni plazo real. No incluyen comisiones, deslizamiento, reglas de trailing drawdown, días mínimos, consistencia, retiros o cambios de régimen.</p>
        </section>
      </div>
    </main>
  )
}
