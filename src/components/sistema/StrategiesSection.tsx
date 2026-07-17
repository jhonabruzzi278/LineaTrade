import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type Strategy = Database['public']['Tables']['strategies']['Row']

export function StrategiesSection({ userId }: { userId: string }) {
  const { showToast } = useToast()
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void loadStrategies()
  }, [])

  async function loadStrategies() {
    const { data, error: loadError } = await supabase
      .from('strategies')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (loadError) {
      setError(getErrorMessage(loadError))
    } else {
      setStrategies(data ?? [])
    }
    setLoading(false)
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    const { data, error: insertError } = await supabase
      .from('strategies')
      .insert({ user_id: userId, name: name.trim(), description: description.trim() || null })
      .select('*')
      .single()
    setSaving(false)
    if (insertError) {
      setError(getErrorMessage(insertError))
      return
    }
    setStrategies((prev) => [...prev, data])
    setName('')
    setDescription('')
    showToast('Estrategia agregada.', 'success')
  }

  async function toggleActive(strategy: Strategy) {
    const { error: updateError } = await supabase
      .from('strategies')
      .update({ is_active: !strategy.is_active })
      .eq('id', strategy.id)
    if (updateError) {
      setError(getErrorMessage(updateError))
      return
    }
    setStrategies((prev) =>
      prev.map((s) => (s.id === strategy.id ? { ...s, is_active: !s.is_active } : s)),
    )
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

  return (
    <div>
      <p className="font-body text-[14px] text-text-muted mb-6">
        Los setups que reconocés como tuyos — para más adelante poder ver qué estrategia te
        funciona y cuál no.
      </p>
      {error && <p className="font-body text-[13px] text-red-400 mb-4">{error}</p>}
      {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}
      {!loading && strategies.length === 0 && (
        <p className="font-body text-[13px] text-text-faint mb-6">Sin estrategias todavía.</p>
      )}
      {strategies.length > 0 && (
        <div className="space-y-3 mb-6">
          {strategies.map((strategy) => (
            <div
              key={strategy.id}
              className="border border-hairline rounded-sm bg-panel px-4 py-3 flex items-start justify-between gap-3"
            >
              <div className={strategy.is_active ? '' : 'opacity-40'}>
                <p className="font-body text-[14px] text-text-primary">{strategy.name}</p>
                {strategy.description && (
                  <p className="font-body text-[13px] text-text-muted mt-1">{strategy.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => void toggleActive(strategy)}
                  className={`font-mono text-[11px] px-2 py-1 rounded-sm border transition-colors ${
                    strategy.is_active ? 'border-signal text-signal' : 'border-hairline text-text-faint'
                  }`}
                >
                  {strategy.is_active ? 'activa' : 'inactiva'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(strategy)}
                  aria-label="Eliminar estrategia"
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la estrategia"
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
          disabled={saving || !name.trim()}
          className="font-body text-[13px] px-4 py-2 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? 'Guardando...' : '+ Agregar estrategia'}
        </button>
      </form>
    </div>
  )
}
