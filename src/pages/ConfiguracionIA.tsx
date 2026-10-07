import { useCallback, useEffect, useState } from 'react'
import { AccountRow, AccountSection } from '../components/account/AccountSection'
import { ByokForm } from '../components/ia/ByokForm'
import { Button } from '../components/ui/button'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { ProgressBar } from '../components/ui/progress-bar'
import { Tag } from '../components/ui/tag'
import { findProvider, modelHasVision } from '../data/aiProviders'
import { useAiUsageToday } from '../hooks/useAiUsageToday'
import { useEntitlements } from '../hooks/useEntitlements'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { useToast } from '../lib/toast'
import type { Database } from '../types/database'

type ByokStatus = Database['public']['Functions']['get_byok_status']['Returns'][number]

const SECURITY_NOTE =
  'Tu clave se guarda cifrada y no se vuelve a mostrar. Solo se usa para tus propias solicitudes, y el costo lo paga tu proveedor.'

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })
}

// Uso de la IA de LineaTrade (tier gratuito): cupo diario real del servidor.
function UsageCard({ userId }: { userId: string }) {
  const { planKey, byFeature, loading } = useEntitlements(userId)
  const used = useAiUsageToday(userId)
  const ai = byFeature.get('ai_actions')
  const daily = ai?.period === 'day' && ai.hardLimit !== null
  const limit = ai?.hardLimit ?? 0

  return (
    <Card as="section" aria-label="Tu uso hoy" className="lg:px-6 lg:py-[22px]">
      <p className="label-mono">Tu uso hoy</p>
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3.5">
        <div>
          <p className="flex items-center gap-2.5 font-body text-[16px] font-bold text-text-primary">
            IA de LineaTrade <Tag tone="brand">{planKey === 'free' ? 'Gratis' : planKey === 'pro' ? 'Pro' : 'Incluida'}</Tag>
          </p>
          {loading ? (
            <p className="num mt-1 text-[12px] text-text-faint">Consultando…</p>
          ) : daily && used !== null ? (
            <p className="num mt-1 text-[12px] text-text-faint">
              {used} de {limit} usos hoy
            </p>
          ) : ai?.hardLimit != null ? (
            <p className="num mt-1 text-[12px] text-text-faint">{ai.hardLimit} usos por mes</p>
          ) : null}
        </div>
      </div>
      {daily && used !== null && (
        <ProgressBar className="mt-3.5" value={limit > 0 ? (used / limit) * 100 : 0} label={`${used} de ${limit} usos de IA hoy`} />
      )}
      <p className="mt-3.5 font-body text-[14px] leading-relaxed text-text-muted">
        Se usa en el Coach, los Insights y la lectura de capturas.
        {daily ? ' Los usos se renuevan cada día.' : ''}
      </p>
    </Card>
  )
}

export default function ConfiguracionIA() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [status, setStatus] = useState<ByokStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [replacing, setReplacing] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStatus = useCallback(async () => {
    const { data, error: statusError } = await supabase.rpc('get_byok_status')
    if (statusError) setError(getErrorMessage(statusError))
    else {
      setError(null)
      setStatus(data?.[0] ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  async function handleDisable() {
    setDisabling(true)
    const { error: disableError } = await supabase.rpc('disable_byok')
    setDisabling(false)
    if (disableError) {
      setError(getErrorMessage(disableError))
      return
    }
    showToast('Volviste a la IA gratuita.', 'success')
    setReplacing(false)
    void loadStatus()
  }

  function handleSaved() {
    showToast('Clave guardada. LineaTrade la usará en tus próximos análisis.', 'success')
    setReplacing(false)
    setLoading(true)
    void loadStatus()
  }

  if (!user) return null

  if (loading) {
    return (
      <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
        <div className="h-28 animate-pulse rounded-xl bg-panel" />
        <div className="h-64 animate-pulse rounded-xl bg-panel" />
      </div>
    )
  }

  const usingOwnKey = Boolean(status?.is_configured && status.use_own_key)
  const providerLabel = status ? (findProvider(status.byok_provider)?.label ?? status.byok_provider) : ''
  const vision = status ? modelHasVision(status.byok_provider, status.byok_model) : null

  return (
    <>
      {error && (
        <p role="alert" className="font-body text-[13px] text-loss">
          {error}
        </p>
      )}

      {usingOwnKey && status ? (
        <>
          <Card as="section" aria-label="Estado de tu clave" className="lg:px-6 lg:py-[22px]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2.5 font-body text-[16px] font-bold text-text-primary">
                  Usando tu propia clave <Tag tone="brand">Activa</Tag>
                </p>
                <p className="num mt-1 text-[12px] text-text-faint">
                  {providerLabel} · {status.byok_model}
                </p>
              </div>
              <span className="num text-[12px] text-text-faint">Actualizada {formatUpdatedAt(status.updated_at)}</span>
            </div>
            <p className="mt-3.5 font-body text-[14px] leading-relaxed text-text-muted">
              Sin el límite diario de LineaTrade. El costo de cada uso lo cobra tu proveedor.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {vision === true && <Tag tone="brand">Visión</Tag>}
              {vision === false && <Tag tone="spark">Sin visión</Tag>}
            </div>
            {vision === false && (
              <p className="mt-2 font-body text-[12px] text-text-faint">
                Este modelo no lee imágenes: la lectura de capturas de trades no funcionará con él.
              </p>
            )}
          </Card>

          <AccountSection title="Tu clave">
            {replacing ? (
              <ByokForm
                initialProvider={status.byok_provider}
                initialModel={status.byok_model}
                submitLabel="Guardar clave nueva"
                onSaved={handleSaved}
                onCancel={() => setReplacing(false)}
              />
            ) : (
              <>
                <AccountRow
                  title="Reemplazar la clave o cambiar de modelo"
                  description="Pega una clave nueva y elige el modelo; la anterior deja de usarse."
                  control={
                    <Button type="button" variant="outline" onClick={() => setReplacing(true)}>
                      Reemplazar clave
                    </Button>
                  }
                />
                <AccountRow
                  title="Volver a la IA gratuita"
                  description="Desactiva tu clave. Vuelves al límite diario de LineaTrade."
                  control={
                    <Button type="button" variant="danger" disabled={disabling} onClick={() => void handleDisable()}>
                      {disabling ? 'Desactivando…' : 'Desactivar mi clave'}
                    </Button>
                  }
                />
              </>
            )}
          </AccountSection>
        </>
      ) : (
        <>
          <UsageCard userId={user.id} />
          <AccountSection title="Usa tu propia clave">
            <p className="-mt-1 mb-4 font-body text-[14px] leading-relaxed text-text-muted">
              Sin el límite diario de LineaTrade. Tú eliges el proveedor y el modelo.
              {status?.is_configured && ' Tienes una clave guardada pero desactivada: para volver a usarla, pégala de nuevo.'}
            </p>
            <ByokForm initialProvider={status?.byok_provider} initialModel={status?.byok_model} submitLabel="Guardar clave" onSaved={handleSaved} />
          </AccountSection>
        </>
      )}

      <Callout>{SECURITY_NOTE}</Callout>
    </>
  )
}
