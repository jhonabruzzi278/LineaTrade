import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'

// Espejo manual de supabase/functions/_shared/newsTypes.ts — no hay forma de
// compartir el tipo entre el bundle de Vite y el runtime Deno del Edge
// Function (mismo criterio que src/lib/aiAnalysis.ts).
export type NewsCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'otro' | 'general'

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
