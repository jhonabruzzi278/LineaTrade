import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Rule = Database['public']['Tables']['trader_rules']['Row']

export function RulesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadRules()
  }, [])

  async function loadRules() {
    const { data, error: loadError } = await supabase
      .from('trader_rules')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (loadError) {
      setError(getErrorMessage(loadError))
    } else {
      setRules(data ?? [])
    }
    setLoading(false)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('trader_rules')
      .insert({ user_id: userId, title: title.trim(), description: description.trim() || null })
      .select('*')
      .single()
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setRules((prev) => [...prev, data])
    setTitle('')
    setDescription('')
    showToast('Regla agregada.', 'success')
  }

  async function toggleActive(rule: Rule) {
    const { error: updateError } = await supabase
      .from('trader_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id)
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
    showToast('Regla eliminada.', 'info')
  }

  return (
    <div>
      <p className="font-body text-[14px] text-text-muted mb-6">
        Tus reglas personales — el sistema que te propusiste seguir antes de entrar a un trade.
      </p>
      {error && <p className="font-body text-[13px] text-red-400 mb-4">{error}</p>}
      {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}
      {!loading && rules.length === 0 && (
        <p className="font-body text-[13px] text-text-faint mb-6">Sin reglas todavía.</p>
      )}
      {rules.length > 0 && (
        <div className="space-y-3 mb-6">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="border border-hairline rounded-sm bg-panel px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className={rule.is_active ? '' : 'opacity-40'}>
                <p className="font-body text-[14px] text-text-primary">{rule.title}</p>
                {rule.description && (
                  <p className="font-body text-[13px] text-text-muted mt-1">{rule.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggleActive(rule)}
                  className={`font-mono text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                    rule.is_active ? 'border-signal text-signal' : 'border-hairline text-text-faint'
                  }`}
                >
                  {rule.is_active ? 'activa' : 'inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(rule)}
                  aria-label="Eliminar regla"
                  className="font-mono text-[13px] text-text-faint hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={(e) => void handleAdd(e)} className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título de la regla"
          className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Detalle (opcional)"
          rows={2}
          className="w-full bg-panel border border-hairline rounded-sm px-4 py-3 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors resize-none"
        />
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="font-body text-[13px] px-4 py-2 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : '+ Agregar regla'}
        </button>
      </form>
    </div>
  )
}
