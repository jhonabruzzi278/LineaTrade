import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { FIELD_CLASS } from '../ui/field'
import type { FundedChallenge } from '../../data/fundedTracker'

interface NewChallengeDialogProps {
  open: boolean
  onClose: () => void
  onSave: (challenge: FundedChallenge) => Promise<void>
}

const INPUT_LABEL = 'block font-body text-[12px] font-semibold text-text-faint'

type RuleTemplateKey = 'manual' | 'two-step' | 'one-step' | 'instant'

interface RuleTemplateValues {
  evaluationType: FundedChallenge['evaluationType']
  targetOne: string
  targetTwo: string
  dailyDd: string
  maxDd: string
  minimumDays: string
  consistency: string
}

// Valores de partida razonables por tipo de evaluación — el usuario los sigue
// pudiendo editar a mano; elegir la plantilla solo deja de ser un control
// decorativo y precarga los campos de abajo.
const RULE_TEMPLATES: Record<RuleTemplateKey, RuleTemplateValues | null> = {
  manual: null,
  'two-step': { evaluationType: '2 fases', targetOne: '8', targetTwo: '5', dailyDd: '5', maxDd: '10', minimumDays: '0', consistency: '' },
  'one-step': { evaluationType: '1 fase', targetOne: '10', targetTwo: '', dailyDd: '5', maxDd: '6', minimumDays: '0', consistency: '' },
  instant: { evaluationType: 'instantánea', targetOne: '0', targetTwo: '', dailyDd: '5', maxDd: '10', minimumDays: '0', consistency: '' },
}

export function NewChallengeDialog({ open, onClose, onSave }: NewChallengeDialogProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [firm, setFirm] = useState('')
  const [accountSize, setAccountSize] = useState('25,000')
  const [cost, setCost] = useState('')
  const [startDate, setStartDate] = useState('')
  const [ruleTemplate, setRuleTemplate] = useState<RuleTemplateKey>('manual')
  const [targetOne, setTargetOne] = useState('8')
  const [targetTwo, setTargetTwo] = useState('5')
  const [dailyDd, setDailyDd] = useState('')
  const [maxDd, setMaxDd] = useState('10')
  const [minimumDays, setMinimumDays] = useState('')
  const [consistency, setConsistency] = useState('')
  const [evaluationType, setEvaluationType] = useState<FundedChallenge['evaluationType']>('2 fases')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { if (open) titleRef.current?.focus() }, [open])
  if (!open) return null

  function applyRuleTemplate(key: RuleTemplateKey) {
    setRuleTemplate(key)
    const values = RULE_TEMPLATES[key]
    if (!values) return
    setEvaluationType(values.evaluationType)
    setTargetOne(values.targetOne)
    setTargetTwo(values.targetTwo)
    setDailyDd(values.dailyDd)
    setMaxDd(values.maxDd)
    setMinimumDays(values.minimumDays)
    setConsistency(values.consistency)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const normalizedSize = Number(accountSize.replace(/[^0-9]/g, ''))
    const normalizedCost = Number(cost)
    if (!firm.trim() || !Number.isFinite(normalizedSize) || normalizedSize <= 0 || !Number.isFinite(normalizedCost) || normalizedCost < 0) return
    setSaving(true)
    setFormError(null)
    try {
      await onSave({
        id: `${firm}-${Date.now()}`, firm: firm.trim(), accountLabel: String(form.get('account') ?? '').trim() || 'Sin vincular', accountSize: normalizedSize,
        evaluationType, cost: normalizedCost, startedAt: dateLabel(startDate), startedOn: startDate, status: evaluationType === 'instantánea' ? 'funded' : 'phase_one', phaseProgress: 0,
        phaseTarget: Number(targetOne) || (evaluationType === '2 fases' ? 8 : 10), realizedPnl: 0, tradeCount: 0, winRate: null, payouts: 0,
        rules: {
          phaseOneTarget: Number(targetOne) || 0,
          phaseTwoTarget: evaluationType === '2 fases' ? numberOrNull(targetTwo) ?? 5 : null,
          dailyDrawdown: numberOrNull(dailyDd), maxDrawdown: numberOrNull(maxDd) ?? 10,
          minimumDays: numberOrNull(minimumDays) ?? 0, consistency: numberOrNull(consistency),
          newAccountForPhaseTwo: form.get('new-account-phase-two') === 'on', notes: String(form.get('notes') ?? '').trim() || null,
        },
      })
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'No se pudo guardar la prueba.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-ink/75 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="new-challenge-title" className="max-h-[92svh] w-full overflow-y-auto rounded-t-xl border border-hairline bg-panel shadow-elevated sm:max-w-2xl sm:rounded-xl">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-hairline bg-panel px-5 py-4"><div><p className="label-mono">Fondeo Tracker</p><h2 id="new-challenge-title" ref={titleRef} tabIndex={-1} className="mt-1 font-display text-[20px] text-text-primary focus:outline-none">Registrar una prueba</h2></div><Button type="button" variant="ghost" size="icon" aria-label="Cerrar formulario" onClick={onClose}><X className="h-5 w-5" /></Button></div>
        <form className="space-y-5 p-5" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2"><FormInput id="firm" label="Empresa o firma" value={firm} onChange={setFirm} placeholder="Ej. FTMO" required /><FormInput id="account" label="Identificador de cuenta" placeholder="Opcional hasta vincular MT5" /></div>
          <div className="grid gap-4 sm:grid-cols-3"><FormInput id="size" label="Tamaño de cuenta" value={accountSize} onChange={setAccountSize} inputMode="numeric" required /><FormInput id="cost" label="Costo USD" value={cost} onChange={setCost} type="number" min="0" required /><FormInput id="start-date" label="Fecha de inicio" value={startDate} onChange={setStartDate} type="date" required /></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className={INPUT_LABEL} htmlFor="evaluation">Tipo de cuenta<select id="evaluation" value={evaluationType} onChange={(event) => { setEvaluationType(event.target.value as FundedChallenge['evaluationType']); setRuleTemplate('manual') }} className={`mt-1.5 ${FIELD_CLASS}`}><option value="2 fases">Evaluación · 2 fases</option><option value="1 fase">Evaluación · 1 fase</option><option value="instantánea">Instant · ya fondeada</option></select></label><label className={INPUT_LABEL} htmlFor="rule-template">Plantilla de reglas<select id="rule-template" value={ruleTemplate} onChange={(event) => applyRuleTemplate(event.target.value as RuleTemplateKey)} className={`mt-1.5 ${FIELD_CLASS}`}><option value="manual">Reglas manuales</option><option value="two-step">2-Step</option><option value="one-step">1-Step</option><option value="instant">Instant Funding</option></select></label></div>
          <div className="grid gap-4 border-y border-hairline py-5 sm:grid-cols-2"><FormInput id="target-one" label="Target F1 (%)" value={targetOne} onChange={setTargetOne} type="number" min="0" /><FormInput id="target-two" label="Target F2 (%)" value={targetTwo} onChange={setTargetTwo} type="number" min="0" placeholder="5" /><FormInput id="daily-dd" label="Daily drawdown (%)" value={dailyDd} onChange={setDailyDd} type="number" min="0" placeholder="5" /><FormInput id="max-dd" label="Max drawdown (%)" value={maxDd} onChange={setMaxDd} type="number" min="0" placeholder="10" /><FormInput id="minimum-days" label="Días mínimos por fase" value={minimumDays} onChange={setMinimumDays} type="number" min="0" placeholder="Ej. 3" /><FormInput id="consistency" label="Consistencia máxima por día (%)" value={consistency} onChange={setConsistency} type="number" min="0" max="100" placeholder="Opcional" /></div>
          <div className="grid gap-4 sm:grid-cols-2"><FormInput id="strategy" label="Estrategia" placeholder="Opcional" /><label className={INPUT_LABEL} htmlFor="notes">Notas<textarea id="notes" name="notes" rows={3} className={`mt-1.5 resize-y py-2.5 ${FIELD_CLASS}`} placeholder="Opcional" /></label></div>
          <label className="flex items-start gap-3 rounded-lg border border-hairline bg-ink/50 p-3.5 font-body text-[12px] leading-relaxed text-text-muted"><input name="new-account-phase-two" type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--color-signal)]" /><span><strong className="text-text-primary">La firma entrega otra cuenta MT5 al pasar a Fase 2.</strong><br />Al aprobar la fase, el Tracker pedirá vincular el nuevo número.</span></label>
          {formError && <p role="alert" className="font-body text-[12px] text-loss">{formError}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button><Button type="submit" variant="cta" disabled={saving}>{saving ? 'Guardando...' : 'Guardar prueba'}</Button></div>
        </form>
      </section>
    </div>
  )
}

function FormInput({ id, label, value, onChange, ...props }: { id: string; label: string; value?: string; onChange?: (value: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'value' | 'onChange'>) {
  return <label className={INPUT_LABEL} htmlFor={id}>{label}<input id={id} name={id} value={value} onChange={(event) => onChange?.(event.target.value)} className={`mt-1.5 ${FIELD_CLASS}`} {...props} /></label>
}

function numberOrNull(value: FormDataEntryValue | null): number | null {
  if (value == null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function dateLabel(value: string): string {
  if (!value) return 'Hoy'
  const date = new Date(`${value}T12:00:00`)
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}
