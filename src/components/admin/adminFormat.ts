const numberFormat = new Intl.NumberFormat('es')

/** Entero con separador de miles local («2.140»). */
export function formatCount(value: number | null | undefined): string {
  return value == null ? '—' : numberFormat.format(value)
}

/** Cifras grandes abreviadas («3,9 M») para tokens. */
export function formatCompact(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('es', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function formatDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

// Nombres de job crudos (cron.job.jobname) traducidos. Si se agrega un job y no
// está aquí se muestra el nombre crudo, sin romper.
export const CRON_JOB_LABELS: Record<string, string> = {
  'news-premarket': 'Noticias · pre-market',
  'market-open': 'Noticias · apertura',
  'market-close': 'Noticias · cierre',
  'post-close': 'Noticias · post-cierre',
  'trade-reminder-afternoon': 'Recordatorio · tarde',
  'trade-reminder-evening': 'Recordatorio · noche',
}

export const CRON_SECRET_LABELS: Record<string, string> = {
  project_url: 'URL del proyecto',
  publishable_key: 'Publishable key',
  news_cron_secret: 'Secreto de noticias',
  trade_reminder_cron_secret: 'Secreto de recordatorios',
}

/** Un job «sano» corrió y terminó bien. `succeeded` también aparece con secretos faltantes: por eso se cruza con el checklist de secretos. */
export function isJobHealthy(status: string | null | undefined): boolean {
  return status === 'succeeded'
}
