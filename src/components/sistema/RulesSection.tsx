import { useEffect, useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Switch } from '../Switch'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { FIELD_CLASS, Field } from '../ui/field'
import { IconButton } from '../ui/icon-button'
import { Tag } from '../ui/tag'
import { EmptyList, ErrorNote, ListSkeleton } from './SectionStates'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { isJournalVerifiedRule } from '../../lib/systemRules'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Rule = Database['public']['Tables']['trader_rules']['Row']

export function RulesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: loadError } = await supabase
        .from('trader_rules')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (loadError) setError(getErrorMessage(loadError))
      else setRules(data ?? [])
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  function resetForm() {
    setEditingId(null)
    setTitle('')
    setDescription('')
  }

  function startEditing(rule: Rule) {
    setEditingId(rule.id)
    setTitle(rule.title)
    setDescription(rule.description ?? '')
    document.getElementById('rule-title')?.focus()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const cleanTitle = title.trim()
    if (!cleanTitle) return
    const cleanDescription = description.trim() || null
    setSaving(true)
    setError(null)

    if (editingId) {
      const { data, error: updateError } = await supabase
        .from('trader_rules')
        .update({ title: cleanTitle, description: cleanDescription })
        .eq('id', editingId)
        .select('*')
        .single()
      setSaving(false)
      if (updateError) {
        setError(getErrorMessage(updateError))
        return
      }
      setRules((prev) => prev.map((r) => (r.id === data.id ? data : r)))
      resetForm()
      showToast('Regla actualizada.', 'success')
      return
    }

    const { data, error: insertError } = await supabase
      .from('trader_rules')
      .insert({ user_id: userId, title: cleanTitle, description: cleanDescription })
      .select('*')
      .single()
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setRules((prev) => [...prev, data])
    resetForm()
    showToast('Regla agregada.', 'success')
  }

  async function toggleActive(rule: Rule) {
    const { error: updateError } = await supabase.from('trader_rules').update({ is_active: !rule.is_active }).eq('id', rule.id)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r)))
  }

  async function handleDelete(rule: Rule) {
    const { error: deleteError } = await supabase
      .from('trader_rules')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', rule.id)
    if (deleteError) {
      setError(getErrorMessage(deleteError))
      return
    }
    setRules((prev) => prev.filter((r) => r.id !== rule.id))
    if (editingId === rule.id) resetForm()
    showToast('Regla eliminada.', 'info')
  }

  const activeCount = rules.filter((r) => r.is_active).length
  const isFormDirty = editingId !== null || title.trim() !== '' || description.trim() !== ''

  return (
    <>
      {error && <ErrorNote message={error} />}

      <AccountSection
        title="Mis reglas"
        aside={rules.length > 0 ? <span className="num text-[12px] text-text-faint">{activeCount} activas de {rules.length}</span> : undefined}
      >
        {loading ? (
          <ListSkeleton />
        ) : rules.length === 0 ? (
          <EmptyList title="Aún no tienes reglas" hint="Escribe la primera abajo: una condición concreta que quieras cumplir antes de entrar a un trade." />
        ) : (
          rules.map((rule) => {
            const verified = isJournalVerifiedRule(rule.title)
            return (
              <AccountRow
                key={rule.id}
                muted={!rule.is_active}
                leading={
                  <Switch hideLabel checked={rule.is_active} onChange={() => void toggleActive(rule)} label={`Regla activa: ${rule.title}`} />
                }
                title={rule.title}
                description={rule.description}
                footer={<Tag tone={verified ? 'brand' : 'neutral'}>{verified ? 'Verificada por el journal' : 'Revisión manual'}</Tag>}
                control={
                  <>
                    <IconButton icon={Pencil} label={`Editar regla: ${rule.title}`} onClick={() => startEditing(rule)} />
                    <IconButton icon={Trash2} tone="danger" label={`Eliminar regla: ${rule.title}`} onClick={() => void handleDelete(rule)} />
                  </>
                }
              />
            )
          })
        )}
      </AccountSection>

      <Card as="section" aria-label={editingId ? 'Editar regla' : 'Nueva regla'} className="lg:px-[22px] lg:py-5">
        <h2 className="font-display text-[16px] text-text-primary">{editingId ? 'Editar regla' : 'Nueva regla'}</h2>
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-3 flex flex-col gap-3">
          <Field id="rule-title" label="Título" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rule-description" className="font-body text-[12px] font-semibold text-text-faint">
              Descripción (opcional)
            </label>
            <textarea
              id="rule-description"
              rows={2}
              value={description}
              maxLength={300}
              onChange={(e) => setDescription(e.target.value)}
              className={`${FIELD_CLASS} resize-none py-2.5`}
            />
          </div>
          <div className="mt-1 flex justify-end gap-2.5">
            {isFormDirty && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="cta" disabled={saving || !title.trim()}>
              {saving ? 'Guardando…' : editingId ? 'Guardar regla' : 'Agregar regla'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
