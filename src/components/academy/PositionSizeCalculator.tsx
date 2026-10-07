import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { cn } from '@/lib/utils'
import type { SavedTradePlan } from '../../hooks/useLessonPractice'
import { formatR, formatSignedAmount, type PositionSizeResult, type TradeDirection } from '../../lib/positionSize'
import { PriceMap } from './PriceMap'
import { issueMessage, type CalculatorForm } from './positionSizeForm'

const DIRECTION_OPTIONS: { value: TradeDirection; label: string }[] = [
  { value: 'long', label: 'Largo' },
  { value: 'short', label: 'Corto' },
]

const amount = (value: number) => value.toLocaleString('es-MX', { maximumFractionDigits: 2 })
const distance = (value: number) => value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const percent = (value: number) => `${Math.round(value * 1000) / 10} %`

function ResultRow({ label, children, first = false }: { label: string; children: ReactNode; first?: boolean }) {
  return (
    <div className={cn('flex items-baseline justify-between gap-2.5 py-2.5 text-[13px]', !first && 'border-t border-hairline')}>
      <span className="font-body text-text-faint">{label}</span>
      <b className="num font-semibold">{children}</b>
    </div>
  )
}

function Fields({ form, idPrefix, wide }: { form: CalculatorForm; idPrefix: string; wide: boolean }) {
  const { values, setValue } = form
  const directionLabelId = `${idPrefix}-dir`
  return (
    <div className={cn('grid gap-x-3 gap-y-3.5', wide ? 'grid-cols-4 gap-x-3.5' : 'grid-cols-2')}>
      <Field id={`${idPrefix}-bal`} label="Saldo demo" mono inputMode="decimal" value={values.balance} onChange={(event) => setValue('balance', event.target.value)} />
      <Field id={`${idPrefix}-risk`} label="Riesgo (1R)" mono inputMode="decimal" value={values.riskPercent} onChange={(event) => setValue('riskPercent', event.target.value)} />
      <Field id={`${idPrefix}-sym`} label="Instrumento" value={values.symbol} maxLength={24} autoCapitalize="characters" onChange={(event) => setValue('symbol', event.target.value)} />
      <div className="flex min-w-0 flex-col gap-1.5">
        <span id={directionLabelId} className="font-body text-[12px] font-semibold text-text-faint">Dirección</span>
        <Segmented label="Dirección" options={DIRECTION_OPTIONS} value={values.direction} onChange={(value) => setValue('direction', value)} />
      </div>
      <Field id={`${idPrefix}-in`} label="Entrada" mono inputMode="decimal" value={values.entry} onChange={(event) => setValue('entry', event.target.value)} />
      <Field id={`${idPrefix}-sl`} label="Stop" mono inputMode="decimal" value={values.stop} onChange={(event) => setValue('stop', event.target.value)} />
      <div className={wide ? undefined : 'col-span-2'}>
        <Field id={`${idPrefix}-tp`} label="Objetivo" mono inputMode="decimal" value={values.target} onChange={(event) => setValue('target', event.target.value)} />
      </div>
    </div>
  )
}

function Issues({ form }: { form: CalculatorForm }) {
  if (form.outcome.ok) return null
  return (
    <ul role="alert" className="mt-3 space-y-1 font-body text-[13px] text-loss">
      {form.outcome.issues.map((issue) => (
        <li key={issue}>{issueMessage(issue, form.values.direction)}</li>
      ))}
    </ul>
  )
}

function SizeValue({ result, className }: { result: PositionSizeResult; className?: string }) {
  return (
    <span className={className}>
      {result.size.toLocaleString('es-MX')} <span className="font-body text-[0.6em] font-semibold text-text-muted">{result.size === 1 ? 'unidad' : 'unidades'}</span>
    </span>
  )
}

function ZeroSizeNote({ result }: { result: PositionSizeResult }) {
  if (result.size > 0) return null
  return <p className="mt-2 font-body text-[12px] text-text-faint">El stop está tan lejos que ni una unidad cabe en tu riesgo: acércalo o sube el riesgo.</p>
}

interface InlineProps {
  form: CalculatorForm
  onSave: (plan: SavedTradePlan) => void
  saved: boolean
}

// Calculadora en línea (escritorio): campos, resultados y mapa de precios.
export function PositionSizeInline({ form, onSave, saved }: InlineProps) {
  const idPrefix = useId()
  const plan = form.buildPlan()
  const { outcome } = form
  return (
    <div className="mt-4 rounded-xl border border-hairline bg-panel p-5 sm:p-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="label-mono">Calculadora de tamaño</h4>
        <span className="num text-[11px] text-text-faint">Precios de ejemplo: usa los de tu instrumento</span>
      </div>
      <div className="mt-4"><Fields form={form} idPrefix={idPrefix} wide /></div>
      <Issues form={form} />
      {outcome.ok && (
        <div className="mt-5 grid items-center gap-x-8 gap-y-4 border-t border-hairline pt-2 sm:grid-cols-[minmax(0,1fr)_150px]">
          <div aria-live="polite">
            <ResultRow label="Riesgo en dinero" first><span className="text-text-primary">{amount(outcome.result.riskAmount)}</span></ResultRow>
            <ResultRow label="Distancia al stop"><span className="text-text-primary">{distance(outcome.result.stopDistance)}</span></ResultRow>
            <ResultRow label="Tamaño de posición"><SizeValue result={outcome.result} className="text-[20px] text-steel" /></ResultRow>
            <ResultRow label="Si toca el stop"><span className="text-loss">{formatSignedAmount(-outcome.result.lossAtStop)} · {formatR(outcome.result.rAtStop)}</span></ResultRow>
            <ResultRow label="Si llega al objetivo"><span className="text-gain">{formatSignedAmount(outcome.result.gainAtTarget)} · {formatR(outcome.result.rAtTarget)}</span></ResultRow>
            <p className="num mt-2.5 text-[11px] leading-relaxed text-text-faint">
              {amount(outcome.result.riskAmount)} ÷ {distance(outcome.result.stopDistance)} = {amount(outcome.result.riskAmount / outcome.result.stopDistance)}, redondeado hacia abajo. No incluye comisiones.
            </p>
            <ZeroSizeNote result={outcome.result} />
          </div>
          <PriceMap direction={form.values.direction} entry={form.prices.entry} stop={form.prices.stop} target={form.prices.target} />
        </div>
      )}
      {outcome.ok && (
        <p className="mt-3.5 font-body text-[13px] leading-relaxed text-text-faint">
          Con una relación riesgo/beneficio de 1 a {Math.round(outcome.result.rewardToRisk * 100) / 100}, necesitas acertar al menos {percent(outcome.result.breakEvenWinRate)} de tus trades para no perder dinero, antes de comisiones.
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={!plan} onClick={() => plan && onSave(plan)}>Guardar mi plan</Button>
        {saved && <span role="status" className="font-body text-[13px] font-semibold text-steel">Plan guardado en este dispositivo.</span>}
      </div>
    </div>
  )
}

interface SheetProps {
  form: CalculatorForm
  onSave: (plan: SavedTradePlan) => void
  onClose: () => void
}

// Calculadora a pantalla completa (móvil): campos arriba y resultado fijo abajo.
export function PositionSizeSheet({ form, onSave, onClose }: SheetProps) {
  const idPrefix = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  const plan = form.buildPlan()
  const { outcome } = form

  useEffect(() => {
    closeRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={`${idPrefix}-title`} className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-ink lg:hidden">
      <header className="flex items-center justify-between px-5 pt-2.5 pb-0">
        <div>
          <p className="label-mono">paso 2 · tu plan</p>
          <h2 id={`${idPrefix}-title`} className="font-display mt-1 text-[22px] text-text-primary">Calculadora de tamaño</h2>
        </div>
        <button ref={closeRef} type="button" aria-label="Cerrar calculadora" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-faint hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>
      <div className="px-5 pt-3.5"><Fields form={form} idPrefix={idPrefix} wide={false} /></div>
      <Issues form={form} />
      <p className="num mx-5 mt-3 text-[11px] text-text-faint">Precios de ejemplo. Usa los de tu instrumento.</p>

      <div className="mt-auto sticky bottom-0 rounded-t-[18px] border-t border-hairline bg-panel px-5 pt-4 pb-6 shadow-elevated">
        {outcome.ok && plan ? (
          <div className="grid grid-cols-[minmax(0,1fr)_104px] items-center gap-3.5" aria-live="polite">
            <div>
              <p className="label-mono">Tamaño de posición</p>
              <p className="font-display mt-1 text-[36px] leading-[1.05] text-steel"><SizeValue result={outcome.result} /></p>
              <p className="num mt-1 text-[11px] text-text-faint">Riesgo {amount(outcome.result.riskAmount)} ÷ distancia {distance(outcome.result.stopDistance)}</p>
              <div className="mt-2.5">
                <ResultRow label="Si toca el stop" first><span className="text-loss">{formatSignedAmount(-outcome.result.lossAtStop)} · {formatR(outcome.result.rAtStop)}</span></ResultRow>
                <ResultRow label="Si llega al objetivo"><span className="text-gain">{formatSignedAmount(outcome.result.gainAtTarget)} · {formatR(outcome.result.rAtTarget)}</span></ResultRow>
              </div>
            </div>
            <PriceMap compact direction={plan.direction} entry={plan.entry} stop={plan.stop} target={plan.target} />
          </div>
        ) : (
          <p className="font-body text-[13px] text-text-faint">
            {outcome.ok ? 'El stop está tan lejos que ni una unidad cabe en tu riesgo.' : 'Completa los datos para ver el tamaño de tu posición.'}
          </p>
        )}
        <Button type="button" variant="cta" size="lg" className="mt-3.5 w-full" disabled={!plan} onClick={() => plan && onSave(plan)}>
          Listo, este es mi plan
        </Button>
        <p className="mt-2.5 text-center font-body text-[11px] leading-relaxed text-text-faint">No incluye comisiones. Se guarda en tu progreso de la lección.</p>
      </div>
    </div>
  )
}

// Resumen del plan guardado (móvil), con acceso a la calculadora.
export function SavedPlanSummary({ plan, onOpen, openerRef }: { plan: SavedTradePlan; onOpen: () => void; openerRef: Ref<HTMLButtonElement> }) {
  const long = plan.direction === 'long'
  return (
    <div className="mt-3.5 rounded-xl border border-hairline bg-panel px-4 pt-1.5 pb-4 lg:hidden">
      <dl>
        {[
          ['Instrumento', `${plan.symbol} · ${long ? 'largo' : 'corto'}`, ''],
          ['Entrada', distance(plan.entry), ''],
          ['Stop', distance(plan.stop), 'text-loss'],
          ['Objetivo', distance(plan.target), 'text-gain'],
          [`Tamaño con 1R = ${amount(plan.riskAmount)}`, `${plan.size.toLocaleString('es-MX')} unidades`, 'text-steel'],
        ].map(([term, value, tone], index) => (
          <div key={term} className={cn('flex items-baseline justify-between gap-2.5 py-2.5 text-[13px]', index > 0 && 'border-t border-hairline')}>
            <dt className="font-body text-text-faint">{term}</dt>
            <dd className={cn('num font-semibold', tone || 'text-text-primary')}>{value}</dd>
          </div>
        ))}
      </dl>
      <Button ref={openerRef} type="button" variant="outline" size="lg" className="mt-3 w-full" onClick={onOpen}>Abrir la calculadora</Button>
    </div>
  )
}
