// Presentación del Coach: agrupación del historial y textos de apoyo. Funciones puras.

export interface DatedConversation {
  updated_at: string
}

export type ConversationGroupLabel = 'Hoy' | 'Ayer' | 'Esta semana' | 'Anteriores'

export interface ConversationGroup<T extends DatedConversation> {
  label: ConversationGroupLabel
  items: T[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const GROUP_ORDER: ConversationGroupLabel[] = ['Hoy', 'Ayer', 'Esta semana', 'Anteriores']

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function labelFor(updatedAt: string, now: Date): ConversationGroupLabel {
  const daysAgo = Math.round((startOfDay(now) - startOfDay(new Date(updatedAt))) / DAY_MS)
  if (daysAgo <= 0) return 'Hoy'
  if (daysAgo === 1) return 'Ayer'
  if (daysAgo < 7) return 'Esta semana'
  return 'Anteriores'
}

/** Agrupa por recencia conservando el orden recibido dentro de cada grupo; omite los grupos vacíos. */
export function groupConversations<T extends DatedConversation>(conversations: T[], now: Date = new Date()): ConversationGroup<T>[] {
  const buckets = new Map<ConversationGroupLabel, T[]>()
  for (const conversation of conversations) {
    const label = labelFor(conversation.updated_at, now)
    buckets.set(label, [...(buckets.get(label) ?? []), conversation])
  }
  return GROUP_ORDER.filter((label) => buckets.has(label)).map((label) => ({ label, items: buckets.get(label) ?? [] }))
}

const TITLE_MAX = 60

/** Título de una conversación nueva: la primera pregunta, recortada. */
export function titleFromFirstMessage(content: string): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  return clean.length > TITLE_MAX ? `${clean.slice(0, TITLE_MAX - 1).trimEnd()}…` : clean
}

export const COACH_SUGGESTIONS = [
  '¿En qué días soy más disciplinado?',
  '¿Cómo me va cuando tengo FOMO?',
  '¿Qué estrategia me funciona mejor?',
  '¿Qué errores repito más?',
] as const
