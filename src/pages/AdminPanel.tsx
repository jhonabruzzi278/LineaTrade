import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { MetricCard } from '../components/MetricCard'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import type { Database } from '../types/database'

type SystemMetrics = Database['public']['Functions']['get_system_metrics']['Returns'][number]
type ProviderConfig = Database['public']['Tables']['ai_provider_config']['Row']
type CronJobHealth = Database['public']['Functions']['get_cron_job_health']['Returns'][number]
type CronSecretStatus = Database['public']['Functions']['get_cron_secrets_status']['Returns'][number]

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
    <div className="min-h-screen">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 pb-28 lg:pb-10 lg:pl-24">
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
              <MetricCard label="Opciones" value={String(metrics.options_trades_total)} />
            </Section>

            <Section title="Motor de IA">
              <MetricCard label="Análisis totales" value={String(metrics.total_ai_analyses)} />
              <MetricCard label="Análisis (7d)" value={String(metrics.ai_analyses_7d)} />
              <MetricCard label="Tokens usados (7d)" value={String(metrics.ai_tokens_used_7d)} />
              <MetricCard label="Usuarios en límite hoy" value={String(metrics.users_hit_daily_limit_today)} />
              <MetricCard label="Proveedor activo" value={formatProvider(metrics)} />
              <MetricCard label="Usuarios con BYOK" value={String(metrics.byok_users)} />
            </Section>

            <Section title="Noticias & IA Trader">
              <MetricCard label="Artículos totales" value={String(metrics.total_news_articles)} />
              <MetricCard label="Última actualización" value={formatDate(metrics.news_latest_fetched_at)} />
              <MetricCard label="Planes generados" value={String(metrics.trader_plans_total)} />
              <MetricCard label="Usuarios únicos" value={String(metrics.trader_plans_unique_users)} />
            </Section>

            <Section title="Notificaciones y Sistema">
              <MetricCard label="Suscripciones push" value={String(metrics.push_subscriptions_total)} />
              <MetricCard label="Objetivos" value={String(metrics.total_objectives)} />
              <MetricCard label="Reglas activas" value={String(metrics.active_trader_rules)} />
              <MetricCard label="Estrategias activas" value={String(metrics.active_strategies)} />
            </Section>

            <p className="font-mono text-[11px] text-text-faint mb-10">
              Actualizado: {new Date(metrics.generated_at).toLocaleString('es-AR')}
            </p>

            <CronHealthSection />
            <ProviderConfigSection />
          </>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}

// Proveedores con implementación real en el registry de ambos Edge
// Functions (analyze-trade, extract-trade-image — ver supabase/functions/
// _shared/providers/). Esta lista es manual porque no hay forma de
// compartir un tipo entre el bundle de Vite y el runtime Deno: si se agrega
// un proveedor nuevo allá, hay que agregarlo acá también o el selector va a
// ofrecer un valor que resuelve en un 501 "no implementado".
const SUPPORTED_PROVIDERS = [
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
]

// Único punto de la app donde se carga la API key del proveedor por defecto
// (tier gratuito) y se elige qué proveedor/modelo usa — antes de esto,
// provider_secret_id y provider_name/model_name solo se seteaban a mano por
// SQL durante desarrollo, nunca vía la app en ningún entorno. Bug real que
// esto causó: guardar acá una key de un proveedor distinto al que ya tenía
// la fila (ej. una key de OpenAI contra una fila etiquetada 'groq') hacía
// que ambos Edge Functions llamaran igual al proveedor viejo con una key que
// no le pertenece — rechazada con 401, surfaceada como 502 genérico. Ahora
// cambiar el proveedor (RPC set_provider_model) limpia la key vieja del
// mismo saque, así el input de abajo pasa a pedir la key correcta antes de
// que cualquiera de los dos Edge Functions vuelva a andar.
function ProviderConfigSection() {
  const { showToast } = useToast()
  const [configs, setConfigs] = useState<ProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [providerName, setProviderName] = useState('')
  const [modelName, setModelName] = useState('')
  const [savingProviderModel, setSavingProviderModel] = useState(false)

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

  useEffect(() => {
    if (defaultConfig) {
      setProviderName(defaultConfig.provider_name)
      setModelName(defaultConfig.model_name)
    }
  }, [defaultConfig?.provider_name, defaultConfig?.model_name])

  async function handleSaveProviderModel(e: FormEvent) {
    e.preventDefault()
    if (!defaultConfig || !providerName.trim() || !modelName.trim()) return
    setSavingProviderModel(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_provider_model', {
      p_provider_config_id: defaultConfig.id,
      p_provider_name: providerName.trim(),
      p_model_name: modelName.trim(),
    })
    setSavingProviderModel(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    showToast('Proveedor y modelo actualizados.', 'success')
    void loadConfigs()
  }

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
            <p className="font-mono text-[11px] text-text-faint mb-4">
              {defaultConfig.provider_secret_id ? 'Key configurada' : 'Sin key configurada — analyze-trade y extract-trade-image fallan hasta que se cargue una'}
            </p>

            <form onSubmit={(e) => void handleSaveProviderModel(e)} className="flex items-end gap-3 mb-4">
              <div>
                <label htmlFor="provider-name" className="font-body text-[13px] text-text-muted block mb-2">
                  Proveedor
                </label>
                <select
                  id="provider-name"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary focus:outline-none focus:border-signal transition-colors"
                >
                  {SUPPORTED_PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="model-name" className="font-body text-[13px] text-text-muted block mb-2">
                  Modelo
                </label>
                <input
                  id="model-name"
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="ej. gpt-4o-mini, openai/gpt-oss-20b"
                  className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={savingProviderModel || !providerName.trim() || !modelName.trim()}
                className="font-body text-[14px] px-5 py-3 rounded-sm border border-hairline text-text-primary hover:border-signal/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingProviderModel ? 'Guardando...' : 'Guardar proveedor y modelo'}
              </button>
            </form>
            <p className="font-mono text-[11px] text-text-faint mb-5">
              Este modelo se usa tanto para el análisis de comportamiento (texto, analyze-trade) como para la
              extracción de datos de fotos (visión, extract-trade-image) — tiene que soportar ambas capacidades, o el
              segundo va a fallar. Cambiar el proveedor borra la key guardada: vas a tener que cargar una key nueva
              abajo.
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

function formatDate(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString('es-AR') : '—'
}

// Nombres de job crudos (cron.job.jobname, ver 20260721130000_news_cron_jobs.sql
// y 20260722110000_trade_reminder_cron_jobs.sql) traducidos a algo legible. Si
// se agrega un job nuevo y no está acá, se muestra el nombre crudo como
// fallback en vez de romper.
const CRON_JOB_LABELS: Record<string, string> = {
  'news-premarket': 'Noticias · pre-market',
  'market-open': 'Noticias · apertura',
  'market-close': 'Noticias · cierre',
  'post-close': 'Noticias · post-cierre',
  'trade-reminder-afternoon': 'Recordatorio · tarde',
  'trade-reminder-evening': 'Recordatorio · noche',
}

const CRON_SECRET_LABELS: Record<string, string> = {
  project_url: 'URL del proyecto',
  publishable_key: 'Publishable key',
  news_cron_secret: 'Secret de noticias',
  trade_reminder_cron_secret: 'Secret de recordatorios',
}

// invoke_news_cron_refresh()/invoke_trade_reminder_cron() solo hacen `raise
// warning` y `return` si faltan secrets en Vault — no lanzan excepción, así
// que cron.job_run_details muestra 'succeeded' igual aunque el POST real
// nunca haya salido (así pasó dos veces en producción, ver CLAUDE.md). Por
// eso esta sección muestra el checklist de secrets Y el último run de cada
// job: ninguno de los dos solo alcanza para confirmar que el cron funciona
// de verdad.
function CronHealthSection() {
  const [jobs, setJobs] = useState<CronJobHealth[]>([])
  const [secrets, setSecrets] = useState<CronSecretStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [jobsResult, secretsResult] = await Promise.all([
        supabase.rpc('get_cron_job_health'),
        supabase.rpc('get_cron_secrets_status'),
      ])
      if (cancelled) return
      if (jobsResult.error) {
        setError(getErrorMessage(jobsResult.error))
      } else if (secretsResult.error) {
        setError(getErrorMessage(secretsResult.error))
      } else {
        setJobs(jobsResult.data ?? [])
        setSecrets(secretsResult.data ?? [])
      }
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return null

  return (
    <Section title="Cron jobs (noticias y recordatorios)">
      <div className="col-span-2 md:col-span-4 border border-hairline rounded-sm bg-panel px-5 py-4">
        {error && <p className="font-body text-[13px] text-loss mb-4">{error}</p>}

        <div className="flex flex-wrap gap-2 mb-5">
          {secrets.map((s) => (
            <span
              key={s.secret_name}
              className={`font-mono text-[11px] px-2 py-1 rounded-sm border ${
                s.is_configured ? 'text-gain border-gain/30' : 'text-loss border-loss/30'
              }`}
            >
              {s.is_configured ? '✓' : '✗'} {CRON_SECRET_LABELS[s.secret_name] ?? s.secret_name}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.job_name}
              className="flex items-center justify-between gap-3 border-t border-hairline pt-2 first:border-t-0 first:pt-0"
            >
              <div>
                <p className="font-body text-[14px] text-text-primary">
                  {CRON_JOB_LABELS[job.job_name] ?? job.job_name}
                </p>
                <p className="font-mono text-[11px] text-text-faint">
                  {job.schedule} UTC · {job.active ? 'activo' : 'pausado'}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`font-mono text-[12px] ${
                    job.last_run_status === 'succeeded'
                      ? 'text-gain'
                      : job.last_run_status
                        ? 'text-loss'
                        : 'text-text-faint'
                  }`}
                >
                  {job.last_run_status ?? 'sin registros'}
                </p>
                <p className="font-mono text-[11px] text-text-faint">{formatDate(job.last_run_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-10">
      <p className="font-mono text-[11px] text-text-faint uppercase tracking-wide mb-3">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{children}</div>
    </div>
  )
}
