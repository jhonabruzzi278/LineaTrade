import { useState } from 'react'
import { AdminAiTab } from '../components/admin/AdminAiTab'
import { AdminInfraTab } from '../components/admin/AdminInfraTab'
import { AdminSummaryTab } from '../components/admin/AdminSummaryTab'
import { useAdminData } from '../components/admin/useAdminData'
import { Tabs } from '../components/ui/tabs'

type Tab = 'resumen' | 'ia' | 'infra'

const TABS: { value: Tab; label: string }[] = [
  { value: 'resumen', label: 'Resumen' },
  { value: 'ia', label: 'IA' },
  { value: 'infra', label: 'Infraestructura' },
]

// Panel de superadmin (el acceso lo controla <SuperAdminRoute>/is_superadmin()
// y cada RPC deja su fila en audit_log). Solo muestra lo que el backend ya
// devuelve: no hay métricas de suscripciones, adopción por módulo ni eventos de
// Flow en get_system_metrics, así que esas tarjetas no se dibujan.
export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('resumen')
  const data = useAdminData()

  return (
    <>
      <Tabs items={TABS} value={tab} onChange={setTab} label="Admin" className="w-full lg:w-fit" />

      {data.loading && (
        <div role="status" aria-label="Cargando" className="flex flex-col gap-3">
          <div className="h-24 animate-pulse rounded-xl bg-panel" />
          <div className="h-48 animate-pulse rounded-xl bg-panel" />
        </div>
      )}

      {!data.loading && data.metricsError && tab !== 'infra' && (
        <p role="alert" className="font-body text-[13px] text-loss">
          No pudimos cargar las métricas: {data.metricsError}
        </p>
      )}

      {!data.loading && tab === 'resumen' && <AdminSummaryTab data={data} />}
      {!data.loading && tab === 'ia' && <AdminAiTab data={data} />}
      {!data.loading && tab === 'infra' && <AdminInfraTab data={data} />}
    </>
  )
}
