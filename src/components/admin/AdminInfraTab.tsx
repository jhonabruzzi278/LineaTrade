import { Check, X } from 'lucide-react'
import { AccountRow, AccountSection } from '../account/AccountSection'
import { Tag } from '../ui/tag'
import { CRON_JOB_LABELS, CRON_SECRET_LABELS, formatDateTime, isJobHealthy } from './adminFormat'
import type { AdminData } from './useAdminData'

// Tareas programadas y secretos. `succeeded` en cron.job_run_details no prueba
// que la llamada HTTP saliera: si falta un secreto, las funciones SQL hacen
// `raise warning` y vuelven sin error. Por eso ambas listas conviven.
export function AdminInfraTab({ data }: { data: AdminData }) {
  const { jobs, secrets, cronError } = data

  if (cronError) {
    return (
      <p role="alert" className="font-body text-[13px] text-loss">
        No pudimos consultar el estado de las tareas: {cronError}
      </p>
    )
  }

  return (
    <>
      <AccountSection title="Tareas programadas">
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[420px] border-collapse font-body text-[13px]" aria-label="Estado de tareas programadas">
            <thead>
              <tr className="text-left">
                <th scope="col" className="label-mono pb-2 font-medium">Tarea</th>
                <th scope="col" className="label-mono pb-2 font-medium">Última ejecución</th>
                <th scope="col" className="label-mono pb-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.job_name} className="border-t border-hairline">
                  <td className="py-3 pr-3">
                    <p className="font-semibold text-text-primary">{CRON_JOB_LABELS[job.job_name] ?? job.job_name}</p>
                    <p className="num text-[11px] text-text-faint">
                      {job.schedule} UTC · {job.active ? 'activo' : 'pausado'}
                    </p>
                  </td>
                  <td className="num py-3 pr-3 text-text-muted">{job.last_run_at ? formatDateTime(job.last_run_at) : 'Sin registros'}</td>
                  <td className="py-3">
                    {job.last_run_status ? (
                      <Tag tone={isJobHealthy(job.last_run_status) ? 'brand' : 'loss'}>{isJobHealthy(job.last_run_status) ? 'OK' : 'Falló'}</Tag>
                    ) : (
                      <Tag>Sin datos</Tag>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jobs.length === 0 && <p className="font-body text-[13px] text-text-faint">No hay tareas programadas registradas.</p>}
      </AccountSection>

      <AccountSection title="Secretos requeridos">
        {secrets.map((secret) => (
          <AccountRow
            key={secret.secret_name}
            title={<span className="num text-[14px]">{CRON_SECRET_LABELS[secret.secret_name] ?? secret.secret_name}</span>}
            control={
              secret.is_configured ? (
                <span className="inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-text-primary">
                  <Check className="h-4 w-4 text-steel" aria-hidden="true" /> Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-body text-[13px] font-semibold text-loss">
                  <X className="h-4 w-4" aria-hidden="true" /> Falta
                </span>
              )
            }
          />
        ))}
        <p className="mt-3 border-t border-hairline pt-3 font-body text-[12px] text-text-faint">
          Solo se comprueba que existan; nunca se muestra su valor. Un secreto faltante hace que la tarea no haga nada sin dar error.
        </p>
      </AccountSection>
    </>
  )
}
