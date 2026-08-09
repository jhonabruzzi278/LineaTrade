import { useEffect, useState, type FormEvent } from 'react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { SettingsGroup, SettingsRow } from '../components/SettingsRow'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import { useSidebar } from '../lib/sidebar'
import { cn } from '@/lib/utils'

// Proveedores con implementación real en el registry de ambos Edge
// Functions (ver supabase/functions/_shared/providers/) — no hay check
// constraint en user_ai_settings.byok_provider (columna text libre), así que
// antes este selector ofrecía 4 proveedores más (anthropic/gemini/deepseek/
// openrouter) que el PRD menciona pero nadie implementó nunca: elegirlos
// guardaba la key igual, y recién al usarla en un análisis se veía un 501
// "no implementado" — un half-finished selector, no un bug de guardado.
// Recortado a los dos que realmente funcionan hoy. El self-hosted (Ollama/LM
// Studio) queda fuera de alcance aparte: un Edge Function en la nube no
// puede alcanzar un servidor en localhost del usuario.
const BYOK_PROVIDERS = ['groq', 'openai'] as const

type ByokStatus = {
  byok_provider: string
  byok_model: string | null
  is_configured: boolean
  use_own_key: boolean
  updated_at: string
}

export default function ConfiguracionIA() {
  const { expanded } = useSidebar()
  const { showToast } = useToast()
  const [status, setStatus] = useState<ByokStatus | null>(null)
  const [provider, setProvider] = useState<string>(BYOK_PROVIDERS[0])
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadStatus() {
    const { data, error: statusError } = await supabase.rpc('get_byok_status')
    if (statusError) {
      setError(getErrorMessage(statusError))
    } else {
      const row = data?.[0] ?? null
      setStatus(row)
      if (row?.byok_provider) setProvider(row.byok_provider)
      if (row?.byok_model) setModel(row.byok_model)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadStatus()
  }, [])

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!apiKey.trim() || !model.trim()) {
      setError('Ingresa el modelo y una API key.')
      return
    }
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_byok_api_key', {
      p_provider: provider,
      p_api_key: apiKey.trim(),
      p_model: model.trim(),
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
    <div className="min-h-screen">
      <AppHeader />
      <main
        className={cn(
          'max-w-3xl mx-auto px-6 py-10 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
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
              <div className="mb-6">
                <p className="font-mono text-[11px] tracking-wide text-text-faint uppercase mb-2 px-1">Estado</p>
                <SettingsGroup>
                  <SettingsRow
                    title={`${status.use_own_key ? 'Usando tu key' : 'Key configurada, pero desactivada'} — ${status.byok_provider}${status.byok_model ? ` · ${status.byok_model}` : ''}`}
                    description={`Actualizada el ${new Date(status.updated_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}`}
                    right={
                      status.use_own_key ? (
                        <button
                          type="button"
                          onClick={() => void handleDisable()}
                          disabled={saving}
                          className="font-body text-[12.5px] text-text-faint hover:text-text-muted transition-colors whitespace-nowrap"
                        >
                          Volver al gratuito
                        </button>
                      ) : undefined
                    }
                  />
                </SettingsGroup>
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)}>
              <p className="font-mono text-[11px] tracking-wide text-text-faint uppercase mb-2 px-1">Nueva key</p>
              <SettingsGroup>
                <SettingsRow
                  title="Proveedor"
                  description="Elegí a quién pertenece la API key que vas a guardar."
                  right={
                    <select
                      id="provider"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="bg-ink border border-hairline rounded-sm pl-3 pr-8 py-2 font-body text-[13px] text-text-primary focus:outline-none focus:border-signal transition-colors"
                    >
                      {BYOK_PROVIDERS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  }
                />
                <SettingsRow
                  title="Modelo"
                  description="Tiene que soportar tanto texto (análisis) como visión (lectura de fotos de trades) — se usa para ambas cosas."
                  footer={
                    <input
                      id="model"
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="ej. gpt-4o-mini, openai/gpt-oss-20b"
                      className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                    />
                  }
                />
                <SettingsRow
                  title="API key"
                  description="Nunca se muestra de nuevo una vez guardada — solo se cifra y se guarda."
                  footer={
                    <input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      autoComplete="off"
                      className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                    />
                  }
                />
              </SettingsGroup>
              {error && <p className="font-body text-[13px] text-loss mt-4">{error}</p>}
              <button
                type="submit"
                disabled={saving}
                className="mt-5 font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
              >
                {saving ? 'Guardando...' : 'Guardar key'}
              </button>
            </form>
          </>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
