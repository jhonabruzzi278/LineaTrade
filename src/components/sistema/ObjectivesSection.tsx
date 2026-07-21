import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import { SettingsGroup, SettingsRow } from '../SettingsRow'
import { Switch } from '../Switch'
import { TrashIcon } from '../icons/NavIcons'
import type { Database } from '../../types/database'

type Objective = Database['public']['Tables']['objectives']['Row']

const METRIC_LABELS: Record<string, string> = {
  win_rate: 'Win rate (%)',
  profit_factor: 'Profit factor',
  r_avg: 'R promedio',
  custom: 'Personalizado',
}
const METRIC_TYPES = Object.keys(METRIC_LABELS)

export function ObjectivesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [metricType, setMetricType] = useState(METRIC_TYPES[0])
  const [targetValue, setTargetValue] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadObjectives()
  }, [])

  async function loadObjectives() {
    const { data, error: loadError } = await supabase
      .from('objectives')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (loadError) {
      setError(getErrorMessage(loadError))
    } else {
      setObjectives(data ?? [])
    }
    setLoading(false)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    const parsedTarget = Number(targetValue)
    if (!title.trim() || !targetValue || Number.isNaN(parsedTarget)) return
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('objectives')
      .insert({
        user_id: userId,
        title: title.trim(),
        metric_type: metricType,
        target_value: parsedTarget,
        period_start: periodStart || null,
        period_end: periodEnd || null,
      })
      .select('*')
      .single()
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setObjectives((prev) => [...prev, data])
    setTitle('')
    setTargetValue('')
    setPeriodStart('')
    setPeriodEnd('')
    showToast('Objetivo agregado.', 'success')
  }

  async function updateProgress(objective: Objective, nextValue: string) {
    const parsed = Number(nextValue)
    if (nextValue === '' || Number.isNaN(parsed)) return
    const { error: updateError } = await supabase
      .from('objectives')
      .update({ current_value: parsed })
      .eq('id', objective.id)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setObjectives((prev) =>
      prev.map((o) => (o.id === objective.id ? { ...o, current_value: parsed } : o)),
    )
  }

  async function toggleAchieved(objective: Objective) {
    const { error: updateError } = await supabase
      .from('objectives')
      .update({ achieved: !objective.achieved })
      .eq('id', objective.id)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setObjectives((prev) =>
      prev.map((o) => (o.id === objective.id ? { ...o, achieved: !o.achieved } : o)),
    )
    if (!objective.achieved) showToast('Objetivo logrado.', 'success')
  }

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

  return (
    <div>
      <p className="font-body text-[14px] text-text-muted mb-6">
        Metas que te marcás sobre tus propias métricas. El avance lo cargás vos — todavía no se
        calcula solo desde tus trades.
      </p>
      {error && <p className="font-body text-[13px] text-loss mb-4">{error}</p>}
      {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}
      {!loading && objectives.length === 0 && (
        <p className="font-body text-[13px] text-text-faint mb-6">Sin objetivos todavía.</p>
      )}
      {objectives.length > 0 && (
        <div className="mb-6">
          <SettingsGroup>
            {objectives.map((objective) => (
              <SettingsRow
                key={objective.id}
                title={objective.title}
                description={`${METRIC_LABELS[objective.metric_type] ?? objective.metric_type}${
                  objective.period_start || objective.period_end
                    ? ` · ${objective.period_start ?? '...'} → ${objective.period_end ?? '...'}`
                    : ''
                }`}
                right={
                  <>
                    <Switch
                      hideLabel
                      checked={objective.achieved}
                      onChange={() => void toggleAchieved(objective)}
                      label={`Marcar como logrado: ${objective.title}`}
                    />
                    <button
                      type="button"
                      onClick={() => void handleDelete(objective)}
                      aria-label={`Eliminar objetivo: ${objective.title}`}
                      className="text-text-faint hover:text-loss transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </>
                }
                footer={
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={objective.current_value ?? 0}
                      onBlur={(e) => void updateProgress(objective, e.target.value)}
                      className="w-24 bg-ink border border-hairline rounded-sm px-3 py-1.5 font-mono text-[13px] text-text-primary focus:outline-none focus:border-signal transition-colors"
                    />
                    <span className="font-mono text-[12px] text-text-faint">/ {objective.target_value}</span>
                  </div>
                }
              />
            ))}
          </SettingsGroup>
        </div>
      )}
      <form onSubmit={(e) => void handleAdd(e)} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título del objetivo"
          className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary focus:outline-none focus:border-signal transition-colors"
          >
            {METRIC_TYPES.map((type) => (
              <option key={type} value={type}>
                {METRIC_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="Meta"
            className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[13px] text-text-primary focus:outline-none focus:border-signal transition-colors"
          />
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[13px] text-text-primary focus:outline-none focus:border-signal transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim() || !targetValue}
          className="font-body text-[13px] px-4 py-2 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : '+ Agregar objetivo'}
        </button>
      </form>
    </div>
  )
}
