import { useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Save, ShieldCheck, Target, Wallet } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { FIELD_CLASS, Field } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { Segmented } from '../components/ui/segmented'

type AccountMode = 'demo' | 'real'
type AccountGoal = 'personal' | 'funded'
type Currency = 'USD' | 'CLP'
type RiskLevel = '0.5' | '1'

type PilotProfile = {
  mode: AccountMode
  goal: AccountGoal
  broker: string
  balance: number
  currency: Currency
  instrument: string
  minimumSize: number
  strategy: string
  session: string
  riskPercent: RiskLevel
}

const STORAGE_KEY = 'lineatrade.pilot-profile.v1'
const DEFAULT_PROFILE: PilotProfile = {
  mode: 'demo',
  goal: 'personal',
  broker: 'XTB',
  balance: 100,
  currency: 'USD',
  instrument: '',
  minimumSize: 0.01,
  strategy: 'Cruce de EMA',
  session: 'Apertura EE. UU. · hora Chile',
  riskPercent: '0.5',
}

function readProfile(): PilotProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const stored = JSON.parse(raw) as Partial<PilotProfile>
    return { ...DEFAULT_PROFILE, ...stored }
  } catch {
    return DEFAULT_PROFILE
  }
}

function formatMoney(value: number, currency: Currency) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: currency === 'CLP' ? 0 : 2 }).format(value)
}

export default function LineaPilot() {
  const [profile, setProfile] = useState<PilotProfile>(readProfile)
  const [saved, setSaved] = useState(() => Boolean(localStorage.getItem(STORAGE_KEY)))

  const readiness = useMemo(() => {
    const steps = [profile.balance > 0, Boolean(profile.instrument.trim()), profile.minimumSize > 0, Boolean(profile.strategy), Boolean(profile.session)]
    return steps.filter(Boolean).length
  }, [profile])
  const riskAmount = profile.balance * (Number(profile.riskPercent) / 100)
  const canSizePosition = profile.balance > 0 && profile.minimumSize > 0 && Boolean(profile.instrument.trim())

  function update<K extends keyof PilotProfile>(key: K, value: PilotProfile[K]) {
    setSaved(false)
    setProfile((current) => ({ ...current, [key]: value }))
  }

  function updateNumber(key: 'balance' | 'minimumSize', value: string) {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) update(key, parsed)
  }

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 sm:px-6 lg:pb-12 lg:pt-10">
      <PageHeader
        kicker="Linea Pilot · preparación"
        title="Mi ruta al primer trade"
        lead="Define tu cuenta, el símbolo exacto de XTB y un riesgo operativo antes de pasar a validación y ejecución manual."
        actions={<Link to="/simulador" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-hairline px-4 font-body text-[13px] font-semibold text-text-muted transition-colors hover:bg-panel-2 hover:text-text-primary">Simulador de fondeo <ArrowRight className="h-4 w-4" /></Link>}
      />

      <section aria-label="Progreso de preparación" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {['Cuenta', 'Mercado', 'Estrategia', 'Validación', 'Operar'].map((step, index) => {
          const current = index === 0
          const done = index === 0 && readiness >= 3
          return <div key={step} className={`rounded-lg border px-3 py-3 ${current ? 'border-signal bg-signal/10' : 'border-hairline bg-panel'}`}><p className="label-mono">0{index + 1}</p><p className="mt-1 font-body text-[13px] font-semibold text-text-primary">{step}</p>{done && <p className="mt-1 flex items-center gap-1 font-mono text-[10px] text-steel"><CheckCircle2 className="h-3 w-3" /> listo</p>}</div>
        })}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
        <Card as="section" className="p-5 sm:p-6">
          <div className="mb-6 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-signal/30 bg-signal/10 text-signal"><Wallet className="h-5 w-5" /></span>
            <div><p className="label-mono">Paso 01</p><h2 className="mt-1 font-display text-[22px] text-text-primary">Cuenta y mercado</h2><p className="mt-1 font-body text-[13px] leading-relaxed text-text-faint">Estos datos se usarán en el backtest y en el ticket de operación.</p></div>
          </div>

          <form onSubmit={saveProfile} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><p className="mb-1.5 font-body text-[12px] font-semibold text-text-faint">Tipo de cuenta</p><Segmented label="Tipo de cuenta" value={profile.mode} onChange={(value) => update('mode', value)} options={[{ value: 'demo', label: 'Demo' }, { value: 'real', label: 'Real' }]} /></div>
              <div><p className="mb-1.5 font-body text-[12px] font-semibold text-text-faint">Objetivo</p><Segmented label="Objetivo de la cuenta" value={profile.goal} onChange={(value) => update('goal', value)} options={[{ value: 'personal', label: 'Capital propio' }, { value: 'funded', label: 'Fondeo' }]} /></div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pilot-broker" label="Broker" value={profile.broker} onChange={(event) => update('broker', event.target.value)} placeholder="Ej. XTB" />
              <label className="flex min-w-0 flex-col gap-1.5"><span className="font-body text-[12px] font-semibold text-text-faint">Moneda base</span><select value={profile.currency} onChange={(event) => update('currency', event.target.value as Currency)} className={FIELD_CLASS}><option value="USD">USD · dólar estadounidense</option><option value="CLP">CLP · peso chileno</option></select></label>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_160px]">
              <Field id="pilot-balance" label="Saldo disponible" type="number" min="0" step="0.01" inputMode="decimal" value={profile.balance} onChange={(event) => updateNumber('balance', event.target.value)} hint="Capital disponible para operar, sin crédito." />
              <Field id="pilot-minimum-size" label="Tamaño mínimo" type="number" min="0" step="0.01" inputMode="decimal" value={profile.minimumSize} onChange={(event) => updateNumber('minimumSize', event.target.value)} hint="Lote o unidades." />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="pilot-instrument" label="Instrumento en xStation" value={profile.instrument} onChange={(event) => update('instrument', event.target.value)} placeholder="Ej. US100, US500, EURUSD" hint="Escribe el símbolo tal como aparece en tu plataforma." />
              <label className="flex min-w-0 flex-col gap-1.5"><span className="font-body text-[12px] font-semibold text-text-faint">Estrategia inicial</span><select value={profile.strategy} onChange={(event) => update('strategy', event.target.value)} className={FIELD_CLASS}><option>Cruce de EMA</option><option>Ruptura de rango</option><option>Reversión a la media</option><option>Manual con checklist</option></select></label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex min-w-0 flex-col gap-1.5"><span className="font-body text-[12px] font-semibold text-text-faint">Horario de operación</span><select value={profile.session} onChange={(event) => update('session', event.target.value)} className={FIELD_CLASS}><option>Apertura EE. UU. · hora Chile</option><option>Sesión de Londres · hora Chile</option><option>Sesión asiática · hora Chile</option><option>Horario personalizado</option></select></label>
              <div><p className="mb-1.5 font-body text-[12px] font-semibold text-text-faint">Riesgo por operación</p><Segmented label="Riesgo por operación" value={profile.riskPercent} onChange={(value) => update('riskPercent', value)} options={[{ value: '0.5', label: '0,5 %' }, { value: '1', label: '1,0 %' }]} /></div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
              <p className="font-body text-[12px] text-text-faint">{readiness} de 5 datos de preparación completos.</p>
              <button type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-signal px-5 font-body text-[13px] font-semibold text-on-signal transition-[background-color,transform] hover:bg-signal-dim active:scale-[0.97]"><Save className="h-4 w-4" />Guardar perfil</button>
            </div>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card as="section" tone="brand" className="p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-75">Riesgo por idea</p>
            <p className="mt-2 font-display text-[34px] leading-none">{formatMoney(riskAmount, profile.currency)}</p>
            <p className="mt-2 font-body text-[12px] leading-relaxed opacity-80">{profile.riskPercent.replace('.', ',')} % de {formatMoney(profile.balance, profile.currency)} por operación.</p>
          </Card>

          <Card as="section">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal/10 text-signal"><ShieldCheck className="h-5 w-5" /></span><div><p className="label-mono">Guardarraíl diario</p><h2 className="mt-1 font-display text-[20px] text-text-primary">{formatMoney(riskAmount * 2, profile.currency)}</h2></div></div>
            <p className="mt-3 font-body text-[12px] leading-relaxed text-text-faint">Pausa interna tras dos riesgos completos. Podrás ajustarla al validar la estrategia.</p>
          </Card>

          <Card as="section">
            <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-steel/10 text-steel"><Target className="h-5 w-5" /></span><div><p className="label-mono">Viabilidad</p><h2 className="mt-1 font-display text-[20px] text-text-primary">{canSizePosition ? 'Por confirmar' : 'Faltan datos'}</h2></div></div>
            <p className="mt-3 font-body text-[12px] leading-relaxed text-text-faint">Antes de crear una orden, compara el riesgo calculado con el tamaño mínimo, spread y coste real del símbolo en XTB.</p>
          </Card>
        </aside>
      </div>

      <section className="mt-5">
        {saved ? <Callout><span className="font-semibold text-text-primary">Perfil guardado.</span> El siguiente paso es convertir {profile.instrument.trim() || 'tu instrumento'} y {profile.strategy} en reglas medibles para el backtest.</Callout> : <Callout>Guarda el perfil para conservar esta configuración en este dispositivo. Después podrás usarla al validar tu estrategia.</Callout>}
      </section>
    </main>
  )
}
