import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Switch } from '../Switch'
import { Button } from '../ui/button'
import { FIELD_CLASS, Field } from '../ui/field'
import { IconButton } from '../ui/icon-button'
import { Sheet } from '../ui/sheet'
import { EmptyList, ErrorNote, ListSkeleton } from './SectionStates'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { describeStrategyStats } from '../../lib/systemRules'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Strategy = Database['public']['Tables']['strategies']['Row']
type StrategyStats = Pick<Database['public']['Views']['v_user_stats_by_strategy']['Row'], 'strategy_name' | 'trade_count' | 'win_rate'>

// `null` = hoja cerrada; `'new'` = crear; un Strategy = editar.
type SheetState = null | 'new' | Strategy

export function StrategiesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [stats, setStats] = useState<Map<string, StrategyStats>>(new Map())
  const [loading, setLoading] = useState(true)
  const [sheet, setSheet] = useState<SheetState>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [listRes, statsRes] = await Promise.all([
        supabase.from('strategies').select('*').is('deleted_at', null).order('created_at', { ascending: true }),
        supabase.from('v_user_stats_by_strategy').select('strategy_name, trade_count, win_rate'),
      ])
      if (cancelled) return
      if (listRes.error) setError(getErrorMessage(listRes.error))
      else setStrategies(listRes.data ?? [])
      // Las estadísticas son un extra: si fallan, la lista sigue siendo útil.
      const byName = new Map<string, StrategyStats>()
      for (const row of statsRes.data ?? []) {
        if (row.strategy_name) byName.set(row.strategy_name, row)
      }
      setStats(byName)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  async function toggleActive(strategy: Strategy) {
    const { error: updateError } = await supabase.from('strategies').update({ is_active: !strategy.is_active }).eq('id', strategy.id)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setStrategies((prev) => prev.map((s) => (s.id === strategy.id ? { ...s, is_active: !s.is_active } : s)))
  }

  async function handleDelete(strategy: Strategy) {
    const { error: deleteError } = await supabase
      .from('strategies')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', strategy.id)
    if (deleteError) {
      setError(getErrorMessage(deleteError))
      return
    }
    setStrategies((prev) => prev.filter((s) => s.id !== strategy.id))
    showToast('Estrategia eliminada.', 'info')
  }

  function handleSaved(saved: Strategy, wasNew: boolean) {
    setStrategies((prev) => (wasNew ? [...prev, saved] : prev.map((s) => (s.id === saved.id ? saved : s))))
    setSheet(null)
    showToast(wasNew ? 'Estrategia agregada.' : 'Estrategia actualizada.', 'success')
  }

  return (
    <>
      {error && <ErrorNote message={error} />}

      <AccountSection
        title="Mis estrategias"
        aside={
          <Button type="button" variant="cta" onClick={() => setSheet('new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva estrategia
          </Button>
        }
      >
        {loading ? (
          <ListSkeleton />
        ) : strategies.length === 0 ? (
          <EmptyList title="Aún no tienes estrategias" hint="Crea la primera para asignarla al registrar un trade y comparar resultados en el Reporte." />
        ) : (
          strategies.map((strategy) => {
            const stat = stats.get(strategy.name)
            return (
              <AccountRow
                key={strategy.id}
                muted={!strategy.is_active}
                leading={
                  <Switch hideLabel checked={strategy.is_active} onChange={() => void toggleActive(strategy)} label={`Estrategia activa: ${strategy.name}`} />
                }
                title={strategy.name}
                description={strategy.description}
                footer={<span className="num text-[12px] text-text-faint">{describeStrategyStats(stat?.trade_count, stat?.win_rate)}</span>}
                control={
                  <>
                    <IconButton icon={Pencil} label={`Editar estrategia: ${strategy.name}`} onClick={() => setSheet(strategy)} />
                    <IconButton icon={Trash2} tone="danger" label={`Eliminar estrategia: ${strategy.name}`} onClick={() => void handleDelete(strategy)} />
                  </>
                }
              />
            )
          })
        )}
      </AccountSection>

      {sheet && <StrategySheet userId={userId} strategy={sheet === 'new' ? null : sheet} onClose={() => setSheet(null)} onSaved={handleSaved} />}
    </>
  )
}

interface StrategySheetProps {
  userId: string
  strategy: Strategy | null
  onClose: () => void
  onSaved: (strategy: Strategy, wasNew: boolean) => void
}

function StrategySheet({ userId, strategy, onClose, onSaved }: StrategySheetProps) {
  const [name, setName] = useState(strategy?.name ?? '')
  const [description, setDescription] = useState(strategy?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName) return
    const cleanDescription = description.trim() || null
    setSaving(true)
    setError(null)
    const query = strategy
      ? supabase.from('strategies').update({ name: cleanName, description: cleanDescription }).eq('id', strategy.id)
      : supabase.from('strategies').insert({ user_id: userId, name: cleanName, description: cleanDescription })
    const { data, error: saveError } = await query.select('*').single()
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    onSaved(data, strategy === null)
  }

  return (
    <Sheet title={strategy ? 'Editar estrategia' : 'Nueva estrategia'} onClose={onClose}>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
        <Field id="strategy-name" label="Nombre" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="strategy-description" className="font-body text-[12px] font-semibold text-text-faint">
            Descripción (opcional)
          </label>
          <textarea
            id="strategy-description"
            rows={3}
            value={description}
            maxLength={300}
            onChange={(e) => setDescription(e.target.value)}
            className={`${FIELD_CLASS} resize-none py-2.5`}
          />
        </div>
        {error && <ErrorNote message={error} />}
        <div className="mt-1 flex justify-end gap-2.5">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="cta" disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar estrategia'}
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
