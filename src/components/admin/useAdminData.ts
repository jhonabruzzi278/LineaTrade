import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { getErrorMessage } from '../../lib/errors'
import type { Database } from '../../types/database'

export type SystemMetrics = Database['public']['Functions']['get_system_metrics']['Returns'][number]
export type CronJobHealth = Database['public']['Functions']['get_cron_job_health']['Returns'][number]
export type CronSecretStatus = Database['public']['Functions']['get_cron_secrets_status']['Returns'][number]

export interface AdminData {
  metrics: SystemMetrics | null
  jobs: CronJobHealth[]
  secrets: CronSecretStatus[]
  /** Error de las métricas (bloquea Resumen e IA). */
  metricsError: string | null
  /** Error del monitoreo de cron (solo afecta a Infraestructura y a «Salud»). */
  cronError: string | null
  loading: boolean
}

// Una sola carga para las tres pestañas. Cada RPC de superadmin deja su fila en
// audit_log, así que no se repite por pestaña: se llama una vez al abrir.
export function useAdminData(): AdminData {
  const [state, setState] = useState<AdminData>({
    metrics: null,
    jobs: [],
    secrets: [],
    metricsError: null,
    cronError: null,
    loading: true,
  })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [metricsRes, jobsRes, secretsRes] = await Promise.all([
        supabase.rpc('get_system_metrics').single(),
        supabase.rpc('get_cron_job_health'),
        supabase.rpc('get_cron_secrets_status'),
      ])
      if (cancelled) return
      const cronFailure = jobsRes.error ?? secretsRes.error
      setState({
        metrics: metricsRes.data ?? null,
        jobs: jobsRes.data ?? [],
        secrets: secretsRes.data ?? [],
        metricsError: metricsRes.error ? getErrorMessage(metricsRes.error) : null,
        cronError: cronFailure ? getErrorMessage(cronFailure) : null,
        loading: false,
      })
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
