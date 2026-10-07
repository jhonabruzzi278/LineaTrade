// Presentación de Noticias: textos de tiempo para la línea de metadatos de cada nota.

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** «ahora», «hace 25 min», «hace 3 h», «hace 2 d» o, pasada una semana, «20 jul». */
export function formatRelativeTime(dateIso: string, now: Date = new Date()): string {
  const published = new Date(dateIso)
  const minutes = Math.floor((now.getTime() - published.getTime()) / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `hace ${days} d`
  return `${published.getDate()} ${MONTHS[published.getMonth()]}`
}
