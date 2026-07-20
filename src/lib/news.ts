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

/** Invoca fetch-news, que refresca el cache si está viejo y devuelve el listado. */
export async function fetchNews(): Promise<FetchNewsResult> {
  const { data, error } = await supabase.functions.invoke<FetchNewsResponse>('fetch-news')

  if (error) {
    return { ok: false, message: await getFunctionErrorMessage(error) }
  }
  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.' }
  }

  return { ok: true, articles: data.articles, partial: data.partial }
}

const ARTICLE_SELECT = 'id, source_name, category, title, url, summary, image_url, published_at'
const RELATED_LIMIT = 4

// A diferencia de fetchNews() (que pasa por fetch-news para disparar el refresh de RSS),
// esto lee directo de news_articles vía el cliente — la tabla ya es select-authenticated
// por RLS (ver la migración de news_articles), no hace falta el Edge Function para un
// solo artículo que ya está en caché.
export async function getNewsArticleById(id: string): Promise<NewsArticle | null> {
  const { data } = await supabase.from('news_articles').select(ARTICLE_SELECT).eq('id', id).maybeSingle()
  return (data as NewsArticle | null) ?? null
}

export async function getRelatedArticles(category: NewsCategory, excludeId: string): Promise<NewsArticle[]> {
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
