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

// Feeds verificados manualmente (petición real, XML válido) antes de
// hardcodearlos aquí — ver la nota en fetch-news/index.ts. Cointelegraph en
// español (es.cointelegraph.com/rss) devolvía 410 Gone al verificar, por eso
// se usa la versión en inglés.
export const NEWS_FEEDS: NewsFeedSource[] = [
  { url: 'https://www.criptonoticias.com/feed/', sourceName: 'CriptoNoticias', category: 'cripto' },
  { url: 'https://cointelegraph.com/rss', sourceName: 'Cointelegraph', category: 'cripto' },
  { url: 'https://www.fxstreet.com/rss/news', sourceName: 'FXStreet', category: 'forex' },
  { url: 'https://www.investing.com/rss/forex.rss', sourceName: 'Investing.com — Forex', category: 'forex' },
  { url: 'https://www.investing.com/rss/commodities.rss', sourceName: 'Investing.com — Materias primas', category: 'futuros' },
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml', sourceName: 'Expansión — Mercados', category: 'acciones' },
  { url: 'https://www.investing.com/rss/news.rss', sourceName: 'Investing.com — Actualidad', category: 'general' },
]
