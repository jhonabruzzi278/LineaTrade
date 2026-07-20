import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AppHeader } from '../components/AppHeader'
import { BottomNav } from '../components/BottomNav'
import { MetricCard } from '../components/MetricCard'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import type { Database } from '../types/database'

type SystemMetrics = Database['public']['Functions']['get_system_metrics']['Returns'][number]
type ProviderConfig = Database['public']['Tables']['ai_provider_config']['Row']

export default function AdminPanel() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data, error: rpcError } = await supabase.rpc('get_system_metrics').single()
      if (cancelled) return
      if (rpcError) {
        setError(getErrorMessage(rpcError))
        setLoading(false)
        return
      }
      setMetrics(data)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 pb-32">
        <p className="font-mono text-[13px] text-signal mb-2">solo superadmin</p>
        <h1 className="font-display text-[28px] text-text-primary mb-8">Panel de sistema</h1>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}
        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && metrics && (
          <>
            <Section title="Usuarios">
              <MetricCard label="Total registrados" value={String(metrics.total_users)} />
              <MetricCard label="Activos (7d)" value={String(metrics.active_users_7d)} />
              <MetricCard label="Activos (30d)" value={String(metrics.active_users_30d)} />
              <MetricCard label="Nuevos (7d)" value={String(metrics.new_users_7d)} />
            </Section>

            <Section title="Trading">
              <MetricCard label="Trades totales" value={String(metrics.total_trades)} />
              <MetricCard label="Abiertos" value={String(metrics.open_trades)} />
              <MetricCard label="Cerrados" value={String(metrics.closed_trades)} />
              <MetricCard label="Últimos 7 días" value={String(metrics.trades_7d)} />
            </Section>

            <Section title="Motor de IA">
              <MetricCard label="Análisis totales" value={String(metrics.total_ai_analyses)} />
              <MetricCard label="Análisis (7d)" value={String(metrics.ai_analyses_7d)} />
              <MetricCard label="Tokens usados (7d)" value={String(metrics.ai_tokens_used_7d)} />
              <MetricCard label="Usuarios en límite hoy" value={String(metrics.users_hit_daily_limit_today)} />
              <MetricCard label="Proveedor activo" value={formatProvider(metrics)} />
            </Section>

            <p className="font-mono text-[11px] text-text-faint mb-10">
              Actualizado: {new Date(metrics.generated_at).toLocaleString('es-AR')}
            </p>

            <ProviderConfigSection />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  )
}

// Único punto de la app donde se carga la API key del proveedor por defecto
// (tier gratuito) — antes de esto, provider_secret_id solo se seteaba a mano
// por SQL durante desarrollo, nunca vía la app en ningún entorno.
function ProviderConfigSection() {
  const { showToast } = useToast()
  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadConfigs() {
    const { data, error: fetchError } = await supabase
      .from('ai_provider_config')
      .select('*')
      .order('created_at', { ascending: true })
    if (fetchError) {
      setError(getErrorMessage(fetchError))
    } else {
      setConfigs(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadConfigs()
  }, [])

  const defaultConfig = configs.find((c) => c.is_default)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!defaultConfig || !apiKey.trim()) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_provider_api_key', {
      p_provider_config_id: defaultConfig.id,
      p_api_key: apiKey.trim(),
    })
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    setApiKey('')
    showToast('Key del proveedor guardada.', 'success')
    void loadConfigs()
  }

  if (loading) return null

  return (
    <Section title="Configuración del proveedor de IA (tier gratuito)">
      <div className="col-span-2 md:col-span-4 border border-hairline rounded-sm bg-panel px-5 py-4">
        {defaultConfig ? (
          <>
            <p className="font-body text-[14px] text-text-primary mb-1">
              {defaultConfig.provider_name} · {defaultConfig.model_name}
            </p>
            <p className="font-mono text-[11px] text-text-faint mb-4">
              {defaultConfig.provider_secret_id ? 'Key configurada' : 'Sin key configurada — analyze-trade y extract-trade-image fallan hasta que se cargue una'}
            </p>
            <form onSubmit={(e) => void handleSave(e)} className="flex items-end gap-3">
              <div className="flex-1">
                <label htmlFor="provider-api-key" className="font-body text-[13px] text-text-muted block mb-2">
                  API key de {defaultConfig.provider_name}
                </label>
                <input
                  id="provider-api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="gsk_..."
                  autoComplete="off"
                  className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={saving || !apiKey.trim()}
                className="font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal"
              >
                {saving ? 'Guardando...' : 'Guardar key'}
              </button>
            </form>
            {error && <p className="font-body text-[13px] text-loss mt-3">{error}</p>}
          </>
        ) : (
          <p className="font-body text-[13px] text-text-muted">No hay proveedor por defecto configurado.</p>
        )}
      </div>
    </Section>
  )
}

function formatProvider(metrics: SystemMetrics): string {
  if (!metrics.default_ai_provider) return '—'
  return `${metrics.default_ai_provider} · ${metrics.default_ai_model ?? '—'}`
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <p className="font-mono text-[11px] text-text-faint uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </div>
  )
}
