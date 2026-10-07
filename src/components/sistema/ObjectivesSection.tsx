import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Button } from '../ui/button'
import { Field } from '../ui/field'
import { IconButton } from '../ui/icon-button'
import { ProgressBar } from '../ui/progress-bar'
import { SelectField } from '../ui/select-field'
import { Sheet } from '../ui/sheet'
import { Tag } from '../ui/tag'
import { EmptyList, ErrorNote, ListSkeleton } from './SectionStates'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { formatDateOnly } from '../../lib/tradeDisplay'
import {
  OBJECTIVE_METRICS,
  OBJECTIVE_METRIC_LABELS,
  defaultObjectiveTitle,
  formatObjectiveValue,
  isObjectiveMetric,
  isObjectiveReached,
  objectiveProgress,
  type ObjectiveMetric,
} from '../../lib/systemRules'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Objective = Database['public']['Tables']['objectives']['Row']
type SheetState = null | 'new' | Objective

function describePeriod(objective: Objective): string {
  const metric = isObjectiveMetric(objective.metric_type) ? OBJECTIVE_METRIC_LABELS[objective.metric_type] : objective.metric_type
  const { period_start: start, period_end: end } = objective
  const period =
    start || end ? `${start ? formatDateOnly(start) : '…'} → ${end ? formatDateOnly(end) : '…'}` : 'Sin periodo'
  return `${period} · ${metric} · valor que anotas tú`
}

export function ObjectivesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: loadError } = await supabase
        .from('objectives')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (loadError) setError(getErrorMessage(loadError))
      else setObjectives(data ?? [])
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleDelete(objective: Objective) {
    const { error: deleteError } = await supabase
      .from('objectives')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', objective.id)
    if (deleteError) {
      setError(getErrorMessage(deleteError))
      return
    }
    setObjectives((prev) => prev.filter((o) => o.id !== objective.id))
    showToast('Objetivo eliminado.', 'info')
  }

  function handleSaved(saved: Objective, wasNew: boolean) {
    setObjectives((prev) => (wasNew ? [...prev, saved] : prev.map((o) => (o.id === saved.id ? saved : o))))
    setSheet(null)
    showToast(wasNew ? 'Objetivo agregado.' : 'Objetivo actualizado.', 'success')
  }

  return (
    <>
      {error && <ErrorNote message={error} />}

      <AccountSection
        title="Mis objetivos"
        aside={
          <Button type="button" variant="cta" onClick={() => setSheet('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo objetivo
          </Button>
        }
      >
        {loading ? (
          <ListSkeleton />
        ) : objectives.length === 0 ? (
          <EmptyList title="Aún no tienes objetivos" hint="Define una meta sobre tus propias métricas y actualiza su valor actual cuando quieras." />
        ) : (
          objectives.map((objective) => {
            const reached = objective.achieved || isObjectiveReached(objective.current_value, objective.target_value)
            const progress = objectiveProgress(objective.current_value, objective.target_value)
            const valueText = `${formatObjectiveValue(objective.metric_type, objective.current_value ?? 0)} / ${formatObjectiveValue(objective.metric_type, objective.target_value)}`
            return (
              <AccountRow
                key={objective.id}
                title={
                  <span className="flex flex-wrap items-center gap-2.5">
                    {objective.title}
                    <Tag tone={reached ? 'gain' : 'neutral'}>{reached ? 'Logrado' : 'En curso'}</Tag>
                  </span>
                }
                description={<span className="num text-[12px]">{describePeriod(objective)}</span>}
                footer={
                  <div className="flex items-center gap-3">
                    <ProgressBar className="flex-1" value={progress} label={`Avance de ${objective.title}`} />
                    <b className="num shrink-0 text-[13px] font-medium text-text-primary">{valueText}</b>
                  </div>
                }
                control={
                  <>
                    <IconButton icon={Pencil} label={`Editar objetivo: ${objective.title}`} onClick={() => setSheet(objective)} />
                    <IconButton icon={Trash2} tone="danger" label={`Eliminar objetivo: ${objective.title}`} onClick={() => void handleDelete(objective)} />
                  </>
                }
              />
            )
          })
        )}
      </AccountSection>

      {sheet && <ObjectiveSheet userId={userId} objective={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} onSaved={handleSaved} />}
    </>
  )
}

interface ObjectiveSheetProps {
  userId: string
  objective: Objective | null
  onClose: () => void
  onSaved: (objective: Objective, wasNew: boolean) => void
}

function ObjectiveSheet({ userId, objective, onClose, onSaved }: ObjectiveSheetProps) {
  const initialMetric = objective && isObjectiveMetric(objective.metric_type) ? objective.metric_type : OBJECTIVE_METRICS[0]
  const [metric, setMetric] = useState<ObjectiveMetric>(initialMetric)
  const [title, setTitle] = useState(objective?.title ?? '')
  const [target, setTarget] = useState(objective ? String(objective.target_value) : '')
  const [current, setCurrent] = useState(objective?.current_value != null ? String(objective.current_value) : '')
  const [periodStart, setPeriodStart] = useState(objective?.period_start ?? '')
  const [periodEnd, setPeriodEnd] = useState(objective?.period_end ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetNumber = Number(target)
  const currentNumber = current === '' ? null : Number(current)
  const needsTitle = metric === 'custom'
  const isValid =
    target !== '' &&
    Number.isFinite(targetNumber) &&
    (currentNumber === null || Number.isFinite(currentNumber)) &&
    (!needsTitle || title.trim() !== '') &&
    (!periodStart || !periodEnd || periodStart <= periodEnd)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isValid) return
    const payload = {
      title: title.trim() || defaultObjectiveTitle(metric, targetNumber),
      metric_type: metric,
      target_value: targetNumber,
      current_value: currentNumber,
      // `achieved` sigue a la meta: al anotar un valor que la alcanza queda logrado.
      achieved: isObjectiveReached(currentNumber, targetNumber),
      period_start: periodStart || null,
      period_end: periodEnd || null,
    }
    setSaving(true)
    setError(null)
    const query = objective
      ? supabase.from('objectives').update(payload).eq('id', objective.id)
      : supabase.from('objectives').insert({ user_id: userId, ...payload })
    const { data, error: saveError } = await query.select('*').single()
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    onSaved(data, objective === null)
  }

  return (
    <Sheet title={objective ? 'Editar objetivo' : 'Nuevo objetivo'} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <SelectField id="obj-metric" label="Métrica" value={metric} onChange={(e) => setMetric(e.target.value as ObjectiveMetric)}>
          {OBJECTIVE_METRICS.map((m) => (
            <option key={m} value={m}>
              {OBJECTIVE_METRIC_LABELS[m]}
            </option>
          ))}
        </SelectField>
        <Field
          id="obj-title"
          label={needsTitle ? 'Título' : 'Título (opcional)'}
          value={title}
          maxLength={120}
          placeholder={needsTitle ? 'Ej. Completar el checklist 20 días' : 'Se genera a partir de la meta'}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3">
          <Field id="obj-target" label="Meta" type="number" inputMode="decimal" step="any" mono value={target} onChange={(e) => setTarget(e.target.value)} />
          <Field id="obj-current" label="Valor actual" type="number" inputMode="decimal" step="any" mono value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field id="obj-from" label="Desde" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          <Field id="obj-to" label="Hasta" type="date" value={periodEnd} min={periodStart || undefined} onChange={(e) => setPeriodEnd(e.target.value)} />
        </div>
        <p className="font-body text-[12px] text-text-faint">El valor actual lo anotas tú: no se calcula solo desde tus trades. Tus estadísticas reales están en el Reporte.</p>
        {error && <ErrorNote message={error} />}
        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="cta" disabled={saving || !isValid}>
            {saving ? 'Guardando…' : 'Guardar objetivo'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
