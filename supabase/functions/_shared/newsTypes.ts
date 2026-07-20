// Noticias — tipos compartidos del Edge Function fetch-news. Espejo manual de
// src/lib/news.ts (no hay forma de compartir el tipo entre el bundle de Vite
// y el runtime Deno del Edge Function).
export type NewsCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'tecnologia' | 'otro' | 'general'

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

// Mayoría en español (audiencia LatAm) — con una excepción deliberada: Yahoo Finance y
// MarketWatch son en inglés, agregadas a pedido explícito para cubrir noticias de mercado
// de EE.UU. que suelen romper en inglés antes que en cualquier fuente hispana. El resto
// de la lista se mantiene en español. Cada fuente fue probada en vivo (curl) antes de
// agregarse acá — un feed roto se traga en silencio como `partial: true`, así que no basta
// con que la URL "parezca" correcta.
// Si alguna fuente falla, fetch-news devuelve `partial: true` y sigue con las que
// respondieron.
export const NEWS_FEEDS: NewsFeedSource[] = [
  { url: 'https://www.criptonoticias.com/feed/', sourceName: 'CriptoNoticias', category: 'cripto' },
  { url: 'https://es.cointelegraph.com/rss', sourceName: 'Cointelegraph', category: 'cripto' },
  { url: 'https://es.investing.com/rss/forex.rss', sourceName: 'Investing.com — Forex', category: 'forex' },
  { url: 'https://es.investing.com/rss/commodities.rss', sourceName: 'Investing.com — Materias primas', category: 'futuros' },
  { url: 'https://es.investing.com/rss/stock.rss', sourceName: 'Investing.com — Bolsa', category: 'acciones' },
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml', sourceName: 'Expansión — Mercados', category: 'acciones' },
  { url: 'https://es.investing.com/rss/news.rss', sourceName: 'Investing.com — Actualidad', category: 'general' },
  { url: 'https://www.xataka.com/feedburner.xml', sourceName: 'Xataka', category: 'tecnologia' },
  { url: 'https://hipertextual.com/feed', sourceName: 'Hipertextual', category: 'tecnologia' },
  { url: 'https://finance.yahoo.com/news/rssindex', sourceName: 'Yahoo Finance', category: 'acciones' },
  { url: 'https://www.marketwatch.com/rss/topstories', sourceName: 'MarketWatch', category: 'acciones' },
]
