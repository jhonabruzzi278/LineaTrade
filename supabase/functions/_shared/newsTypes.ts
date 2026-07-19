// Noticias — tipos compartidos del Edge Function fetch-news. Espejo manual de
// src/lib/news.ts (no hay forma de compartir el tipo entre el bundle de Vite
// y el runtime Deno del Edge Function).
export type NewsCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'otro' | 'general'

export interface NewsFeedSource {
  url: string
  sourceName: string
  category: NewsCategory
}

export interface NewsArticleDTO {
  id: string
  source_name: string
  category: NewsCategory
  title: string
  url: string
  summary: string | null
  image_url: string | null
  published_at: string
}

export interface FetchNewsResponse {
  articles: NewsArticleDTO[]
  refreshed: boolean
  partial: boolean
}

// Feeds en español exclusivamente. Se priorizan fuentes hispanas de
// trading/finanzas para que el producto sea coherente con su audiencia LatAm.
// Si alguna fuente falla, fetch-news devuelve `partial: true` y sigue con
// las que respondieron.
export const NEWS_FEEDS: NewsFeedSource[] = [
  { url: 'https://www.criptonoticias.com/feed/', sourceName: 'CriptoNoticias', category: 'cripto' },
  { url: 'https://es.cointelegraph.com/rss', sourceName: 'Cointelegraph', category: 'cripto' },
  { url: 'https://es.investing.com/rss/forex.rss', sourceName: 'Investing.com — Forex', category: 'forex' },
  { url: 'https://es.investing.com/rss/commodities.rss', sourceName: 'Investing.com — Materias primas', category: 'futuros' },
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml', sourceName: 'Expansión — Mercados', category: 'acciones' },
  { url: 'https://es.investing.com/rss/news.rss', sourceName: 'Investing.com — Actualidad', category: 'general' },
]
