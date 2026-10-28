import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { ProgressBar } from '../components/ui/progress-bar'
import { drawdownTypeLabel, formatUsd, FUNDED_ACCOUNT_SIZES, FUNDED_PROFILES, type DrawdownType, type FundedProfile } from '../data/fundedRules'

type Scenario = {
  balance: number
  target: number
  phaseTwoTarget: number
  dailyLoss: number
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
  phaseTwoTarget: 0,
  dailyLoss: 0,
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
  const [profile, setProfile] = useState<FundedProfile>('custom')
  const [accountSize, setAccountSize] = useState(100_000)
  const [customDrawdownType, setCustomDrawdownType] = useState<DrawdownType>('static')
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

  function selectProfile(nextProfile: FundedProfile) {
    setProfile(nextProfile)
    const rules = FUNDED_PROFILES[nextProfile]
    if (!rules) return
    setScenario((current) => ({
      ...current,
      balance: accountSize,
      target: accountSize * rules.phaseOneTarget / 100,
      phaseTwoTarget: accountSize * (rules.phaseTwoTarget ?? 0) / 100,
      dailyLoss: rules.dailyLossPercent === null ? 0 : accountSize * rules.dailyLossPercent / 100,
      maxLoss: accountSize * rules.maxLossPercent / 100,
    }))
    setCustomDrawdownType(rules.drawdownType)
  }

  function selectAccountSize(raw: string) {
    const balance = Number(raw)
    if (!Number.isFinite(balance) || balance <= 0) return
    setAccountSize(balance)
    if (profile === 'custom') return
    const rules = FUNDED_PROFILES[profile]
    if (!rules) return
    setScenario((current) => ({
      ...current,
      balance,
      target: balance * rules.phaseOneTarget / 100,
      phaseTwoTarget: balance * (rules.phaseTwoTarget ?? 0) / 100,
      dailyLoss: rules.dailyLossPercent === null ? 0 : balance * rules.dailyLossPercent / 100,
      maxLoss: balance * rules.maxLossPercent / 100,
    }))
  }

  const selectedRules = FUNDED_PROFILES[profile]
  const mechanicalPlan = useMemo(() => {
    const perTrade = Math.min(scenario.balance * 0.0025, scenario.maxLoss * 0.02, scenario.risk)
    const dailyGuardrail = Math.min(scenario.maxLoss * 0.1, scenario.dailyLoss > 0 ? scenario.dailyLoss * 0.4 : Number.POSITIVE_INFINITY)
    const maxTradesToStop = Math.max(1, Math.floor(dailyGuardrail / perTrade))
    return { perTrade, dailyGuardrail, maxTradesToStop }
  }, [scenario.balance, scenario.dailyLoss, scenario.maxLoss, scenario.risk])

  const valid = scenario.balance > 0 && scenario.target > 0 && scenario.phaseTwoTarget >= 0 && scenario.dailyLoss >= 0 && scenario.maxLoss > 0 && scenario.risk > 0 && scenario.winRate >= 0 && scenario.winRate <= 100 && scenario.rewardRisk > 0 && scenario.tradesPerDay > 0

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <PageHeader kicker="Análisis · escenarios" title="Simulador de fondeo" lead="Compara modelos de evaluación de CFDs y futuros, o configura las reglas de cualquier proveedor." actions={<Link to="/academia" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-4 font-body text-[13px] font-semibold text-text-muted hover:bg-panel hover:text-text-primary">Repasar conceptos <ArrowRight className="h-4 w-4" /></Link>} />

      <Callout className="mb-6">Las plantillas son modelos de referencia, no reglas de una firma específica. Verifica con el proveedor si el límite se calcula sobre balance o equity, cuándo se reinicia y si es estático, EOD o trailing.</Callout>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <Card as="section" aria-labelledby="scenario-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><p className="label-mono">Configura el escenario</p><h2 id="scenario-title" className="mt-1 font-display text-[19px] text-text-primary">Parámetros de evaluación</h2></div>
            <button type="button" onClick={() => setScenario(DEFAULT_SCENARIO)} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 font-body text-[12px] font-semibold text-text-faint hover:bg-panel-2 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"><RotateCcw className="h-3.5 w-3.5" />Restablecer</button>
          </div>
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <label className="block font-body text-[13px] text-text-muted" htmlFor="funded-profile">
              Modelo de reglas
              <select id="funded-profile" value={profile} onChange={(event) => selectProfile(event.target.value as FundedProfile)} className="mt-2 min-h-11 w-full rounded-lg border border-hairline bg-ink px-3 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                {Object.entries(FUNDED_PROFILES).map(([value, rules]) => <option key={value} value={value}>{rules?.label ?? 'Personalizado'}</option>)}
              </select>
            </label>
            <label className="block font-body text-[13px] text-text-muted" htmlFor="funded-balance">
              Capital nominal
              <select id="funded-balance" value={accountSize} onChange={(event) => selectAccountSize(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-hairline bg-ink px-3 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                {FUNDED_ACCOUNT_SIZES.map((balance) => <option key={balance} value={balance}>{formatUsd(balance)}</option>)}
              </select>
            </label>
          </div>
          {selectedRules && <div className="mb-5 rounded-lg border border-hairline bg-ink/60 p-4" aria-live="polite">
            <p className="label-mono">Reglas del modelo · {selectedRules.label}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <RuleFact label="Objetivo primera fase" value={`${selectedRules.phaseOneTarget}% · ${formatUsd(accountSize * selectedRules.phaseOneTarget / 100)}`} />
              {selectedRules.phaseTwoTarget !== null && <RuleFact label="Objetivo segunda fase" value={`${selectedRules.phaseTwoTarget}% · ${formatUsd(accountSize * selectedRules.phaseTwoTarget / 100)}`} />}
              <RuleFact label="Pérdida diaria máxima" value={selectedRules.dailyLossPercent === null ? 'No definida' : `${selectedRules.dailyLossPercent}% · ${formatUsd(accountSize * selectedRules.dailyLossPercent / 100)}`} />
              <RuleFact label="Pérdida máxima" value={`${selectedRules.maxLossPercent}% · ${formatUsd(accountSize * selectedRules.maxLossPercent / 100)}`} />
              <RuleFact label="Cálculo del drawdown" value={drawdownTypeLabel(profile === 'custom' ? customDrawdownType : selectedRules.drawdownType)} />
              <RuleFact label="Consistencia" value={selectedRules.consistencyPercent === null ? 'No definida' : `${selectedRules.consistencyPercent}%`} />
              <RuleFact label="Días mínimos" value={selectedRules.minimumDays === null ? 'No definidos' : String(selectedRules.minimumDays)} />
            </dl>
          </div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="sim-balance" label="Balance de referencia (USD)" type="number" min="1" step="1000" value={scenario.balance} onChange={(event) => update('balance', event.target.value)} />
            <Field id="sim-target" label="Objetivo de ganancia (USD)" type="number" min="1" step="100" value={scenario.target} onChange={(event) => update('target', event.target.value)} />
            <Field id="sim-phase-two-target" label="Objetivo segunda fase (USD · 0 = no aplica)" type="number" min="0" step="100" value={scenario.phaseTwoTarget} onChange={(event) => update('phaseTwoTarget', event.target.value)} />
            <Field id="sim-daily-loss" label="Pérdida diaria (USD · 0 = sin límite)" type="number" min="0" step="100" value={scenario.dailyLoss} onChange={(event) => update('dailyLoss', event.target.value)} />
            <Field id="sim-max-loss" label="Pérdida máxima definida (USD)" type="number" min="1" step="100" value={scenario.maxLoss} onChange={(event) => update('maxLoss', event.target.value)} />
            <Field id="sim-risk" label="Riesgo por operación (USD)" type="number" min="1" step="25" value={scenario.risk} onChange={(event) => update('risk', event.target.value)} />
            <Field id="sim-win-rate" label="Win rate hipotético (%)" type="number" min="0" max="100" step="1" value={scenario.winRate} onChange={(event) => update('winRate', event.target.value)} />
            <Field id="sim-rr" label="Ganancia media / riesgo (R)" type="number" min="0.1" step="0.1" value={scenario.rewardRisk} onChange={(event) => update('rewardRisk', event.target.value)} />
            <Field id="sim-trades-day" label="Operaciones por sesión" type="number" min="1" step="1" value={scenario.tradesPerDay} onChange={(event) => update('tradesPerDay', event.target.value)} className="sm:col-span-2 sm:max-w-[calc(50%-0.5rem)]" />
            {profile === 'custom' && <label className="block font-body text-[13px] text-text-muted" htmlFor="sim-drawdown-type">Cálculo de pérdida máxima
              <select id="sim-drawdown-type" value={customDrawdownType} onChange={(event) => setCustomDrawdownType(event.target.value as DrawdownType)} className="mt-2 min-h-11 w-full rounded-lg border border-hairline bg-ink px-3 text-[14px] text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
                <option value="static">Estática</option><option value="end-of-day">EOD · fin del día</option><option value="trailing">Trailing · móvil</option>
              </select>
            </label>}
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
          <Card>
            <p className="label-mono">Guardarraíl mecánico de riesgo</p>
            <p className="mt-2 font-body text-[12px] leading-relaxed text-text-faint">Límite interno conservador calculado desde tu capital y drawdown; no es una regla del proveedor ni una estrategia de entrada.</p>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <RuleFact label="Riesgo máximo por trade" value={money(mechanicalPlan.perTrade)} />
              <RuleFact label="Pausa diaria al perder" value={money(mechanicalPlan.dailyGuardrail)} />
              <RuleFact label="Trades completos hasta pausa" value={`≈ ${mechanicalPlan.maxTradesToStop}`} />
              <RuleFact label="Tope de posiciones" value="Una idea a la vez" />
            </dl>
          </Card>
          <p className="px-1 font-body text-[11px] leading-relaxed text-text-faint">Las sesiones se calculan dividiendo el objetivo por la expectativa matemática; no estiman probabilidad ni plazo real. No incluyen comisiones, deslizamiento, reglas de trailing drawdown, días mínimos, consistencia, retiros o cambios de régimen.</p>
        </section>
      </div>
    </main>
  )
}

function RuleFact({ label, value }: { label: string; value: string }) {
  return <div><dt className="font-body text-[11px] text-text-faint">{label}</dt><dd className="mt-0.5 font-mono text-[13px] font-semibold text-text-primary">{value}</dd></div>
}
