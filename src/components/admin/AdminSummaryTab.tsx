import { AccountRow, AccountSection } from '../account/AccountSection'
import { Tag } from '../ui/tag'
import { AdminStat, AdminStatGrid, AdminStatSection } from './AdminStat'
import { formatCount, formatDateTime, isJobHealthy } from './adminFormat'
import type { AdminData } from './useAdminData'

export function AdminSummaryTab({ data }: { data: AdminData }) {
  const { metrics, jobs, secrets, cronError } = data
  if (!metrics) return null

  const jobsOk = jobs.filter((job) => isJobHealthy(job.last_run_status)).length
  const secretsOk = secrets.filter((secret) => secret.is_configured).length
  const cronKnown = !cronError

  return (
    <>
      <AdminStatGrid>
        <AdminStat label="Usuarios registrados" value={formatCount(metrics.total_users)} />
        <AdminStat label="Activos · 7 días" value={formatCount(metrics.active_users_7d)} hint={`${formatCount(metrics.active_users_30d)} en 30 días`} />
        <AdminStat label="Nuevos · 7 días" value={formatCount(metrics.new_users_7d)} />
        <AdminStat label="Trades · 7 días" value={formatCount(metrics.trades_7d)} />
      </AdminStatGrid>

      {cronKnown && (
        <AccountSection title="Salud">
          <AccountRow
            title="Tareas programadas"
            control={<Tag tone={jobsOk === jobs.length && jobs.length > 0 ? 'brand' : 'loss'}>{jobsOk} de {jobs.length} OK</Tag>}
          />
          <AccountRow
            title="Secretos"
            control={<Tag tone={secretsOk === secrets.length && secrets.length > 0 ? 'brand' : 'loss'}>{secretsOk} de {secrets.length} OK</Tag>}
          />
        </AccountSection>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-[18px]">
        <AdminStatSection title="Journal">
          <AdminStat label="Trades totales" value={formatCount(metrics.total_trades)} />
          <AdminStat label="Abiertos" value={formatCount(metrics.open_trades)} />
          <AdminStat label="Cerrados" value={formatCount(metrics.closed_trades)} />
          <AdminStat label="Opciones" value={formatCount(metrics.options_trades_total)} />
        </AdminStatSection>

        <AdminStatSection title="Sistema de los usuarios">
          <AdminStat label="Reglas activas" value={formatCount(metrics.active_trader_rules)} />
          <AdminStat label="Estrategias activas" value={formatCount(metrics.active_strategies)} />
          <AdminStat label="Objetivos" value={formatCount(metrics.total_objectives)} />
        </AdminStatSection>

        <AdminStatSection title="Noticias, IA Trader y avisos">
          <AdminStat label="Artículos" value={formatCount(metrics.total_news_articles)} hint={`Última carga: ${formatDateTime(metrics.news_latest_fetched_at)}`} />
          <AdminStat label="Planes IA Trader" value={formatCount(metrics.trader_plans_total)} hint={`${formatCount(metrics.trader_plans_unique_users)} usuarios`} />
          <AdminStat label="Suscripciones push" value={formatCount(metrics.push_subscriptions_total)} />
          <AdminStat label="Usuarios con BYOK" value={formatCount(metrics.byok_users)} />
        </AdminStatSection>
      </div>

      <p className="num text-[11px] text-text-faint">Actualizado: {formatDateTime(metrics.generated_at)}</p>
    </>
  )
}
