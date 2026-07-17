import { useEffect, useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'

// Proveedores cloud soportados por BYOK en Fase 3 — coincide con el check
// constraint de user_ai_settings.byok_provider (self-hosted como Ollama/LM
// Studio queda deliberadamente fuera de alcance, ver plan de Fase 3: un Edge
// Function en la nube no puede alcanzar un servidor en localhost del usuario).
const BYOK_PROVIDERS = ['groq', 'openai', 'anthropic', 'gemini', 'deepseek', 'openrouter'] as const

type ByokStatus = {
  byok_provider: string
  is_configured: boolean
  use_own_key: boolean
  updated_at: string
}

export default function ConfiguracionIA() {
  const { showToast } = useToast()
  const [status, setStatus] = useState<ByokStatus | null>(null)
  const [provider, setProvider] = useState<string>(BYOK_PROVIDERS[0])
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadStatus() {
    const { data, error: statusError } = await supabase.rpc('get_byok_status')
    if (statusError) {
      setError(getErrorMessage(statusError))
    } else {
      setStatus(data?.[0] ?? null)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!apiKey.trim()) {
      setError('Ingresa una API key.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_byok_api_key', {
      p_provider: provider,
      p_api_key: apiKey.trim(),
    })
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    setApiKey('') // nunca se re-muestra la key ingresada
    showToast('Key guardada — LineaTrade la va a usar para tus próximos análisis.', 'success')
    void loadStatus()
  }

  async function handleDisable() {
    setSaving(true)
    setError(null)
    const { error: disableError } = await supabase.rpc('disable_byok')
    setSaving(false)
    if (disableError) {
      setError(getErrorMessage(disableError))
      return
    }
    showToast('Volviste al tier gratuito.', 'success')
    void loadStatus()
  }

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <p className="font-mono text-[12px] text-signal tracking-wide mb-2">configuración</p>
        <h1 className="font-display text-[26px] text-text-primary mb-1">Tu propia API key (BYOK)</h1>
        <p className="font-body text-[14px] text-text-muted mb-8">
          Con tu propia key no hay límite diario de análisis — el costo lo asumís vos directamente con
          el proveedor. Sin una key propia, seguís con el tier gratuito (3 análisis por día).
        </p>

        {loading ? (
          <p className="font-body text-[14px] text-text-muted">Cargando...</p>
        ) : (
          <>
            {status?.is_configured && (
              <div className="border border-hairline rounded-sm bg-panel px-5 py-4 mb-6">
                <p className="font-body text-[14px] text-text-primary mb-1">
                  {status.use_own_key ? 'Usando tu key' : 'Key configurada, pero desactivada'} — {status.byok_provider}
                </p>
                <p className="font-mono text-[11px] text-text-faint mb-3">
                  Actualizada el {new Date(status.updated_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {status.use_own_key && (
                  <button
                    type="button"
                    onClick={() => void handleDisable()}
                    disabled={saving}
                    className="font-body text-[13px] text-text-faint hover:text-text-muted transition-colors"
                  >
                    Volver al tier gratuito
                  </button>
                )}
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)} className="space-y-5">
              <div>
                <label htmlFor="provider" className="font-body text-[13px] text-text-muted block mb-2">
                  Proveedor
                </label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary focus:outline-none focus:border-signal transition-colors"
                >
                  {BYOK_PROVIDERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="api-key" className="font-body text-[13px] text-text-muted block mb-2">
                  API key
                </label>
                <input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                />
                <p className="font-mono text-[11px] text-text-faint mt-2">
                  Nunca se muestra de nuevo una vez guardada — solo se cifra y se guarda.
                </p>
              </div>
              {error && <p className="font-body text-[13px] text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
              >
                {saving ? 'Guardando...' : 'Guardar key'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
