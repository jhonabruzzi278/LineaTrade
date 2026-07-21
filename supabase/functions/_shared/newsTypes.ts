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

// Mayoría en español (audiencia LatAm) — con excepción deliberada de Yahoo
// Finance y MarketWatch (inglés) agregadas a pedido explícito para cubrir
// noticias de mercado de EE.UU. que rompen en inglés antes que cualquier
// fuente hispana. Cada fuente fue probada en vivo (curl) antes de agregarse
// acá — un feed roto se traga en silencio como `partial: true`.
//
// 2026-07-21 — ampliada con fuentes en español LatAm (BBC Mundo, El País
// Economía, El Economista, InfoBae, La Nación) y APIs públicas/free-tier
// (GDELT 2.0, CryptoCompare News API, CoinGecko news endpoint — todos
// gratuitos, sin API key). Las fuentes con paywall conocido o ToS
// prohibitivos se marcan `rss-snippet-only` y nunca se scrapean.
//
// Tiers asignados por auditoría manual de cada dominio (robots.txt + ToS) —
// ninguna fuente usa full-republish (ver comentario de LicenseTier arriba):
// - BBC Mundo / El Confidencial / Expansión / InfoBae / La Nación /
//   El Economista (Mx): dominio propio de la fuente, contenido accesible
//   sin paywall → fair-use-reprint (primer párrafo + link).
// - El País: paywall (suscripción) → snippet-only.
// - Investing.com: ToS restrictivos → snippet-only.
// - Yahoo Finance / MarketWatch: snippet-only.
// - Xataka / Hipertextual / CriptoNoticias / Cointelegraph: blogs
//   comerciales con copyright estándar (no CC verificada pese a lo que
//   decía una versión anterior de este comentario) → fair-use-reprint,
//   nunca full-republish.
// - GDELT / CryptoCompare / CoinGecko: son agregadores — cada item apunta a
//   un dominio de terceros distinto que este proyecto no audita artículo por
//   artículo, así que no hay un `robotsAllowed`/tier de dominio fijo que
//   aplicarles → snippet-only siempre, nunca se sigue el link para scrapear.
export const NEWS_FEEDS: NewsFeedSource[] = [
  // Cripto — blogs comerciales, excerpt corto solamente
  { url: 'https://www.criptonoticias.com/feed/', sourceName: 'CriptoNoticias', category: 'cripto', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://es.cointelegraph.com/rss', sourceName: 'Cointelegraph', category: 'cripto', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  // Forex / Materias primas / Bolsa — Investing tiene términos prohibitivos
  { url: 'https://es.investing.com/rss/forex.rss', sourceName: 'Investing.com — Forex', category: 'forex', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/commodities.rss', sourceName: 'Investing.com — Materias primas', category: 'futuros', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/stock.rss', sourceName: 'Investing.com — Bolsa', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://es.investing.com/rss/news.rss', sourceName: 'Investing.com — Actualidad', category: 'general', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // España — Expansión/El Confidencial libres, El País paywall
  { url: 'https://e00-expansion.uecdn.es/rss/mercados.xml', sourceName: 'Expansión — Mercados', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://feeds.elconfidencial.com/economia.xml', sourceName: 'El Confidencial — Economía', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://elpais.com/rss/economia.xml', sourceName: 'El País — Economía', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // LatAm
  { url: 'https://www.infobae.com/mercados/feed/', sourceName: 'InfoBae — Mercados', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://www.lanacion.com.ar/economia/rss/', sourceName: 'La Nación — Economía', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://www.elleconomista.com.mx/rss.xml', sourceName: 'El Economista (Mx)', category: 'acciones', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://www.bbc.com/mundo/economia/index.xml', sourceName: 'BBC Mundo — Economía', category: 'general', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  // Tecnología — blogs comerciales, excerpt corto solamente
  { url: 'https://www.xataka.com/feedburner.xml', sourceName: 'Xataka', category: 'tecnologia', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  { url: 'https://hipertextual.com/feed', sourceName: 'Hipertextual', category: 'tecnologia', licenseTier: 'fair-use-reprint', robotsAllowed: true },
  // Inglés — paywall/snippet-only
  { url: 'https://finance.yahoo.com/news/rssindex', sourceName: 'Yahoo Finance', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'https://www.marketwatch.com/rss/topstories', sourceName: 'MarketWatch', category: 'acciones', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  // APIs públicas (no RSS — consumidas separadamente en fetch-news). Se
  // marcan como objetos news-feed con un scheme especial para que el
  // parser sepa invocar el endpoint correcto en vez de rss-parser. Son
  // agregadores (ver nota arriba) — snippet-only siempre, nunca scraping.
  { url: 'gdelt://api/v2/artlist?format=rss&maxrecords=20&topic=econ', sourceName: 'GDELT Economy', category: 'general', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'cryptocompare://api/v2/news/?lang=ES', sourceName: 'CryptoCompare News', category: 'cripto', licenseTier: 'rss-snippet-only', robotsAllowed: false },
  { url: 'coingecko://api/v3/news', sourceName: 'CoinGecko News', category: 'cripto', licenseTier: 'rss-snippet-only', robotsAllowed: false },
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
