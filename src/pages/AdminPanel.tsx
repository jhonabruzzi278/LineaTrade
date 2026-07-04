import { useEffect, useState, type ReactNode } from 'react'
import { AppHeader } from '../components/AppHeader'
import { MetricCard } from '../components/MetricCard'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import type { Database } from '../types/database'

type SystemMetrics = Database['public']['Functions']['get_system_metrics']['Returns'][number]

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
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="font-mono text-[13px] text-signal mb-2">solo superadmin</p>
        <h1 className="font-display text-[28px] text-text-primary mb-8">Panel de sistema</h1>

        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}
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

            <p className="font-mono text-[11px] text-text-faint">
              Actualizado: {new Date(metrics.generated_at).toLocaleString('es-AR')}
            </p>
          </>
        )}
      </main>
    </div>
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
