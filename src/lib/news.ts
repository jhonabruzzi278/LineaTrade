import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'

// Espejo manual de supabase/functions/_shared/newsTypes.ts — no hay forma de
// compartir el tipo entre el bundle de Vite y el runtime Deno del Edge
// Function (mismo criterio que src/lib/aiAnalysis.ts).
export type NewsCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'tecnologia' | 'otro' | 'general'

export interface NewsArticle {
  id: string
  source_name: string
  category: NewsCategory
  title: string
  url: string
  summary: string | null
  image_url: string | null
  published_at: string
}

interface FetchNewsResponse {
  articles: NewsArticle[]
  refreshed: boolean
  partial: boolean
}

export type FetchNewsResult =
  | { ok: true; articles: NewsArticle[]; partial: boolean }
  | { ok: false; message: string }

export const NEWS_CATEGORY_LABELS: Record<NewsCategory, string> = {
  acciones: 'Acciones',
  forex: 'Forex',
  cripto: 'Cripto',
  futuros: 'Futuros',
  tecnologia: 'Tecnología',
  otro: 'Otro',
  general: 'General',
}

// Cache en memoria (module-level) del último listado. Sin esto, cada montaje de
// /noticias re-invoca el Edge Function y el feed "flashea" el skeleton aunque los
// datos ya estén en memoria (lista → detalle → volver). El Edge Function ya cachea
// server-side (25 min); acá solo se evita el round-trip dentro de la misma sesión
// de la SPA. Es memoria volátil a propósito — nunca localStorage: mismo criterio
// que el service worker, que jamás cachea respuestas de Supabase.
const CLIENT_CACHE_MS = 5 * 60_000

let newsCache: { articles: NewsArticle[]; partial: boolean; fetchedAt: number } | null = null

/** Último listado ya cargado en esta sesión (sin red) — null si todavía no hay nada. */
export function getCachedNews(): { articles: NewsArticle[]; partial: boolean } | null {
  if (!newsCache) return null
  return { articles: newsCache.articles, partial: newsCache.partial }
}

/** Invoca fetch-news, que refresca el cache si está viejo y devuelve el listado. */
export async function fetchNews(): Promise<FetchNewsResult> {
  if (newsCache && Date.now() - newsCache.fetchedAt < CLIENT_CACHE_MS) {
    return { ok: true, articles: newsCache.articles, partial: newsCache.partial }
  }

  const { data, error } = await supabase.functions.invoke<FetchNewsResponse>('fetch-news')

  if (error) {
    return { ok: false, message: await getFunctionErrorMessage(error) }
  }
  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.' }
  }

  newsCache = { articles: data.articles, partial: data.partial, fetchedAt: Date.now() }
  return { ok: true, articles: data.articles, partial: data.partial }
}

const ARTICLE_SELECT = 'id, source_name, category, title, url, summary, image_url, published_at'
const RELATED_LIMIT = 4

// A diferencia de fetchNews() (que pasa por fetch-news para disparar el refresh de RSS),
// esto lee directo de news_articles vía el cliente — la tabla ya es select-authenticated
// por RLS (ver la migración de news_articles), no hace falta el Edge Function para un
// solo artículo que ya está en caché.
export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  // Camino común: se llegó desde la lista, así que el artículo ya está en el
  // cache de sesión — el detalle abre al instante, sin spinner ni red.
  const cached = newsCache?.articles.find((article) => article.id === id)
  if (cached) return cached

  const { data } = await supabase.from('news_articles').select(ARTICLE_SELECT).eq('id', id).maybeSingle()
  return (data as NewsArticle | null) ?? null
}

/**
 * Vecinos del artículo `id` dentro del MISMO orden en que se muestran en
 * `/noticias` (el cache de sesión, no filtrado por categoría) — para el
 * swipe/flechas "anterior · siguiente" en NoticiaDetail. Solo funciona si el
 * usuario ya visitó `/noticias` en esta sesión (cache poblado); si llegó por
 * link directo sin pasar por la lista, no hay "orden" del que derivar
 * vecinos, así que devuelve `null` en ambos — NoticiaDetail simplemente no
 * muestra la navegación en vez de inventar un orden a partir de una sola
 * consulta directa.
 */
export function getAdjacentArticleIds(id: string): { prevId: string | null; nextId: string | null } {
  if (!newsCache) return { prevId: null, nextId: null }
  const list = newsCache.articles
  const index = list.findIndex((article) => article.id === id)
  if (index === -1) return { prevId: null, nextId: null }
  return {
    prevId: index > 0 ? list[index - 1].id : null,
    nextId: index < list.length - 1 ? list[index + 1].id : null,
  }
}

export async function getRelatedArticles(category: NewsCategory, excludeId: string): Promise<NewsArticle[]> {
  // El cache ya trae el listado completo ordenado por fecha desc — filtrar en
  // memoria evita otro round-trip. Si no alcanza (cache vacío para esa
  // categoría), se cae a la consulta directa.
  if (newsCache) {
    const fromCache = newsCache.articles
      .filter((article) => article.category === category && article.id !== excludeId)
      .slice(0, RELATED_LIMIT)
    if (fromCache.length > 0) return fromCache
  }

  const { data } = await supabase
    .from('news_articles')
    .select(ARTICLE_SELECT)
    .eq('category', category)
    .neq('id', excludeId)
    .order('published_at', { ascending: false })
    .limit(RELATED_LIMIT)
  return (data as NewsArticle[] | null) ?? []
}

export function formatPublished(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}

/** "18:18 · 20 jul" — timestamp compacto para filas de lista densa (estilo wire/feed). */
export function formatListTimestamp(dateIso: string): string {
  const date = new Date(dateIso)
  const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })
  const day = date.toLocaleDateString('es', { day: 'numeric', month: 'short' }).replace('.', '')
  return `${time} · ${day}`
}

const PARAGRAPH_SENTENCE_COUNT = 2

/**
 * Agrupa el resumen del feed en párrafos cortos (a diferencia de
 * splitIntoKeyPoints, que recorta a 5 oraciones sueltas como bullets) para el
 * lector full-screen de NoticiaDetail — conserva el resumen completo como
 * texto corrido, más parecido a leer el cuerpo de una nota. Sigue siendo el
 * mismo `summary` licenciado por el feed, no el artículo completo.
 */
export function splitIntoParagraphs(summary: string): string[] {
  const sentences = summary
    .split(/(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
  const paragraphs: string[] = []
  for (let i = 0; i < sentences.length; i += PARAGRAPH_SENTENCE_COUNT) {
    paragraphs.push(sentences.slice(i, i + PARAGRAPH_SENTENCE_COUNT).join(' '))
  }
  return paragraphs
}

export function timeAgo(dateIso: string): string {
  const diff = Date.now() - new Date(dateIso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Ahora'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Hace ${days} d`
  return formatPublished(dateIso)
}
