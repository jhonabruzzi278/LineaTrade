// Noticias — tipos compartidos del Edge Function fetch-news. Espejo manual de
// src/lib/news.ts (no hay forma de compartir el tipo entre el bundle de Vite
// y el runtime Deno del Edge Function).
//
// 2026-07-21 — extends con tier de licencia por fuente (backing del Edge
// Function fetch-article-body). Sólo dos tiers, deliberadamente — un tercer
// tier `full-republish` (cuerpo completo scrapeado) se evaluó y se descartó:
// ninguna fuente de esta lista tiene una licencia de redistribución completa
// realmente verificada (blogs comerciales como Xataka/Cointelegraph/
// CriptoNoticias son copyright estándar, no CC — la nota original en este
// archivo lo afirmaba sin verificación real, lo cual era un riesgo legal).
// `fair-use-reprint` (excerpt corto + atribución + link, siempre desde el
// dominio propio de la fuente) es la extracción más agresiva que este
// producto hace. `rss-snippet-only` usa únicamente el `summary` que la
// fuente ya publica en su feed para sindicación — nunca toca el sitio.
export type NewsCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'tecnologia' | 'otro' | 'general'

/**
 * Tier de licencia que aplica al contenido del sitio publicador:
 * - `fair-use-reprint`: se scrapea la propia página del artículo (dominio
 *   de la fuente, no un agregador de terceros) para extraer sólo el
 *   encabezado + primer párrafo como texto plano — defendible como uso
 *   justo informativo, nunca el cuerpo completo. Siempre con atribución +
 *   link obligatorio al original.
 * - `rss-snippet-only`: no toca el sitio publicador (paywall, ToS
 *   prohibitivos, o el artículo vive en un dominio de terceros que este
 *   feed no controla — ver nota de agregadores más abajo). Usa únicamente
 *   el `summary` del feed RSS/API y confía en el CTA externo para el
 *   contenido completo.
 */
export type LicenseTier = 'fair-use-reprint' | 'rss-snippet-only'

export interface NewsFeedSource {
  url: string
  sourceName: string
  category: NewsCategory
  /** Tier de licencia — ver comentario de LicenseTier arriba. */
  licenseTier: LicenseTier
  /**
   * true si el robots.txt del dominio permite fetch del contenido publicado.
   * Auditoría manual antes de agregar cualquier nueva fuente en tier
   * `fair-use-reprint` — false desactiva el scraping incluso si licenseTier
   * lo permitiría. No se verifica en runtime (no hay fetch de robots.txt en
   * este proyecto) — es una bandera mantenida a mano, tratarla como tal.
   */
  robotsAllowed: boolean
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

/** Tier de licencia de un cuerpo ya scrapeado — persiste en news_article_body. */
export type BodyLicense = LicenseTier

export interface ArticleBodyDTO {
  article_id: string
  body_text: string | null
  word_count: number | null
  content_license: BodyLicense
  source_url: string
  fetched_at: string
}

export interface FetchArticleBodyResponse {
  body: ArticleBodyDTO | null
  /** true si el body ya estaba en cache y no se hizo scraping esta vez. */
  cached: boolean
  /** Razon si no se pudo obtener cuerpo (snippet-only, paywall, fetch fallo). */
  reason: string | null
}

export interface FetchNewsResponse {
  articles: NewsArticleDTO[]
  refreshed: boolean
  partial: boolean
}

// Mayoría en español (audiencia LatAm), con cobertura cripto, mercados y
// tecnología. Las APIs que requerían claves o devolvían errores se sustituyeron
// por RSS públicos. Cada feed se verifica en runtime y sus errores quedan en
// los logs estructurados de fetch-news.
//
// Se usa solo el snippet RSS en Investing.com, El País, los agregadores
// Bloomberg Línea/Ámbito y las fuentes en inglés. Los otros dominios pasan
// por la extracción breve definida en LicenseTier arriba.
export const NEWS_FEEDS: NewsFeedSource[] = [
  // Cripto
  { url: 'https://www.criptonoticias.com/feed/', sourceName: 'CriptoNoticias', category: 'cripto', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://cointelegraph.com/rss', sourceName: 'Cointelegraph', category: 'cripto', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', sourceName: 'CoinDesk', category: 'cripto', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // Forex / Materias primas / Bolsa — Investing tiene términos prohibitivos
  { url: 'https://es.investing.com/rss/forex.rss', sourceName: 'Investing.com — Forex', category: 'forex', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/commodities.rss', sourceName: 'Investing.com — Materias primas', category: 'futuros', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/stock.rss', sourceName: 'Investing.com — Bolsa', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/news.rss', sourceName: 'Investing.com — Actualidad', category: 'general', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // España
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml', sourceName: 'Expansión — Mercados', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://rss.elconfidencial.com/economia/', sourceName: 'El Confidencial — Economía', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/economia/portada', sourceName: 'El País — Economía', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // LatAm — feeds de medios de economía/mercados.
  { url: 'https://www.ambito.com/rss/pages/economia.xml', sourceName: 'Ámbito — Economía', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.bloomberglinea.com/arc/outboundfeeds/rss/?outputType=xml', sourceName: 'Bloomberg Línea', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/?outputType=xml', sourceName: 'La Nación — Economía', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.eleconomista.com.mx/rss/ultimas-noticias', sourceName: 'El Economista (Mx)', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.bbc.com/mundo/economia/index.xml', sourceName: 'BBC Mundo — Economía', category: 'general', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  // Tecnología — blogs comerciales, excerpt corto solamente
  { url: 'https://www.xataka.com/feedburner.xml', sourceName: 'Xataka', category: 'tecnologia', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://hipertextual.com/feed', sourceName: 'Hipertextual', category: 'tecnologia', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  // Inglés — solo snippets del feed
  { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', sourceName: 'CNBC — Mercados', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.marketwatch.com/rss/topstories', sourceName: 'MarketWatch', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
]

/**
 * Duración del cache server-side del cuerpo scrapeado. Si fetched_at > 24h,
 * fetch-article-body refresca; si no, devuelve cache sin tocar el sitio
 * publicador (regla anti-abuso: incluso sin cuota por usuario, no scrapeamos
 * el mismo artículo 2 veces en menos de un día).
 */
export const BODY_CACHE_MS = 24 * 60 * 60 * 1000

/** Determina el tier de una fuente a partir del sourceName exacto del feed. */
export function licenseTierForSource(sourceName: string): LicenseTier | null {
  const feed = NEWS_FEEDS.find((f) => f.sourceName === sourceName)
  return feed ? feed.licenseTier : null
}

/** Determina si está permitido scrape el sitio publicador de una fuente. */
export function robotsAllowedForSource(sourceName: string): boolean {
  const feed = NEWS_FEEDS.find((f) => f.sourceName === sourceName)
  return feed ? feed.robotsAllowed : false
}
