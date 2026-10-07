import { useEffect, useState, type FormEvent } from 'react'
import { AccountSection } from '../account/AccountSection'
import { ModelSelect } from '../ia/ModelSelect'
import { Button } from '../ui/button'
import { Field } from '../ui/field'
import { SelectField } from '../ui/select-field'
import { AdminStat, AdminStatGrid } from './AdminStat'
import { formatCompact, formatCount } from './adminFormat'
import type { AdminData } from './useAdminData'
import { AI_PROVIDERS, findProvider } from '../../data/aiProviders'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import { useToast } from '../../lib/toast'
import type { Database } from '../../types/database'

type ProviderConfig = Database['public']['Tables']['ai_provider_config']['Row']
type RateLimitConfig = Database['public']['Tables']['ai_rate_limit_config']['Row']

// Proveedor y modelo del tier gratuito. Cambiar de proveedor borra la key
// guardada (la RPC set_provider_model lo hace): una key de otro proveedor
// fallaría con 401 en analyze-trade y extract-trade-image. La key se envía por
// RPC y nunca se lee de vuelta.
function ProviderConfigCard() {
  const { showToast } = useToast()
  const [config, setConfig] = useState<ProviderConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [providerName, setProviderName] = useState('')
  const [modelName, setModelName] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [savingModel, setSavingModel] = useState(false)
  const [savingKey, setSavingKey] = useState(false)

  async function loadConfig() {
    const { data, error: fetchError } = await supabase
      .from('ai_provider_config')
      .select('*')
      .eq('is_default', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (fetchError) {
      setError(getErrorMessage(fetchError))
    } else if (data) {
      setConfig(data)
      setProviderName(data.provider_name)
      setModelName(data.model_name)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  async function handleSaveProviderModel(event: FormEvent) {
    event.preventDefault()
    if (!config || !providerName.trim() || !modelName.trim()) return
    setSavingModel(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_provider_model', {
      p_provider_config_id: config.id,
      p_provider_name: providerName.trim(),
      p_model_name: modelName.trim(),
    })
    setSavingModel(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    showToast('Proveedor y modelo actualizados.', 'success')
    void loadConfig()
  }

  async function handleSaveKey(event: FormEvent) {
    event.preventDefault()
    if (!config || !apiKey.trim()) return
    setSavingKey(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_provider_api_key', {
      p_provider_config_id: config.id,
      p_api_key: apiKey.trim(),
    })
    setSavingKey(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    setApiKey('')
    showToast('Clave del proveedor guardada.', 'success')
    void loadConfig()
  }

  if (loading) return <div role="status" aria-label="Cargando" className="h-56 animate-pulse rounded-xl bg-panel" />

  if (!config) {
    return (
      <AccountSection title="Proveedor de IA · tier gratuito">
        <p className="font-body text-[13px] text-text-faint">No hay proveedor por defecto configurado.</p>
        {error && <p role="alert" className="mt-2 font-body text-[13px] text-loss">{error}</p>}
      </AccountSection>
    )
  }

  const providerKnown = findProvider(providerName) !== undefined
  const providerChanged = providerName !== config.provider_name
  const hasKey = Boolean(config.provider_secret_id)

  return (
    <AccountSection title="Proveedor de IA · tier gratuito">
      <form onSubmit={(e) => void handleSaveProviderModel(e)}>
        <div className="grid gap-3.5 lg:grid-cols-2">
          <SelectField
            id="admin-provider"
            label="Proveedor"
            value={providerName}
            onChange={(e) => {
              setProviderName(e.target.value)
              setModelName(findProvider(e.target.value)?.models[0].value ?? '')
            }}
          >
            {!providerKnown && <option value={providerName}>{providerName}</option>}
            {AI_PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <ModelSelect id="admin-model" providerId={providerName} value={modelName} onChange={setModelName} />
        </div>
        <p className="mt-3 font-body text-[12px] text-text-faint">
          El mismo modelo se usa para texto (análisis, Coach, Insights) y para visión (lectura de capturas): tiene que soportar ambas.
          {providerChanged && ' Cambiar el proveedor borra la clave guardada: tendrás que cargar una nueva.'}
        </p>
        <div className="mt-4 flex justify-end">
          <Button type="submit" variant="cta" disabled={savingModel || !providerName.trim() || !modelName.trim()}>
            {savingModel ? 'Guardando…' : 'Guardar proveedor y modelo'}
          </Button>
        </div>
      </form>

      <form onSubmit={(e) => void handleSaveKey(e)} className="mt-5 border-t border-hairline pt-5">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="min-w-[220px] flex-1">
            <Field
              id="admin-api-key"
              label="Clave de API (tier gratuito)"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={hasKey ? 'Clave guardada y cifrada' : 'Sin clave: las funciones de IA fallan hasta cargar una'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" disabled={savingKey || !apiKey.trim()}>
            {savingKey ? 'Guardando…' : hasKey ? 'Reemplazar clave' : 'Guardar clave'}
          </Button>
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-3 font-body text-[13px] text-loss">
          {error}
        </p>
      )}
    </AccountSection>
  )
}

// Límite diario del tier gratuito (fila única ai_rate_limit_config). Lo leen
// las Edge Functions en cada llamada: cambiarlo no requiere redeploy. BYOK no
// está sujeto a este número.
function RateLimitCard({ hitToday }: { hitToday: number | null }) {
  const { showToast } = useToast()
  const [config, setConfig] = useState<RateLimitConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dailyLimit, setDailyLimit] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadConfig() {
    const { data, error: fetchError } = await supabase.from('ai_rate_limit_config').select('*').eq('id', 1).maybeSingle()
    if (fetchError) setError(getErrorMessage(fetchError))
    else if (data) {
      setConfig(data)
      setDailyLimit(String(data.free_tier_daily_limit))
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadConfig()
  }, [])

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    const parsed = Number(dailyLimit)
    if (!Number.isInteger(parsed) || parsed < 1) return
    setSaving(true)
    setError(null)
    const { error: saveError } = await supabase.rpc('set_ai_rate_limit', { p_daily_limit: parsed })
    setSaving(false)
    if (saveError) {
      setError(getErrorMessage(saveError))
      return
    }
    showToast('Límite de IA actualizado.', 'success')
    void loadConfig()
  }

  if (loading) return <div role="status" aria-label="Cargando" className="h-32 animate-pulse rounded-xl bg-panel" />

  const parsed = Number(dailyLimit)
  const valid = Number.isInteger(parsed) && parsed >= 1

  return (
    <AccountSection title="Límite diario · tier gratuito">
      <form onSubmit={(e) => void handleSave(e)} className="flex flex-wrap items-end gap-3.5">
        <div className="w-44">
          <Field id="admin-daily-limit" label="Usos por usuario al día" type="number" min={1} step={1} mono value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={saving || !valid || parsed === config?.free_tier_daily_limit}>
          {saving ? 'Guardando…' : 'Guardar límite'}
        </Button>
        {hitToday !== null && (
          <span className="num pb-3 text-[12px] text-text-faint">
            {formatCount(hitToday)} {hitToday === 1 ? 'usuario llegó' : 'usuarios llegaron'} al límite hoy
          </span>
        )}
      </form>
      <p className="mt-3 font-body text-[12px] text-text-faint">
        Aplica a Coach, Insights, análisis y lectura de capturas. Quien usa su propia clave (BYOK) no está sujeto a este número.
      </p>
      {error && (
        <p role="alert" className="mt-3 font-body text-[13px] text-loss">
          {error}
        </p>
      )}
    </AccountSection>
  )
}

export function AdminAiTab({ data }: { data: AdminData }) {
  const { metrics } = data
  if (!metrics) return null
  const provider = metrics.default_ai_provider ? `${metrics.default_ai_provider} · ${metrics.default_ai_model ?? '—'}` : '—'

  return (
    <>
      <AdminStatGrid>
        <AdminStat label="Análisis · 7 d" value={formatCount(metrics.ai_analyses_7d)} hint={`${formatCount(metrics.total_ai_analyses)} en total`} />
        <AdminStat label="Tokens · 7 d" value={formatCompact(metrics.ai_tokens_used_7d)} />
        <AdminStat label="En el límite hoy" value={formatCount(metrics.users_hit_daily_limit_today)} hint="usuarios" />
        <AdminStat label="BYOK activos" value={formatCount(metrics.byok_users)} />
      </AdminStatGrid>
      <p className="num -mt-1 text-[12px] text-text-faint">Proveedor activo: {provider}</p>
      <ProviderConfigCard />
      <RateLimitCard hitToday={metrics.users_hit_daily_limit_today} />
    </>
  )
}
