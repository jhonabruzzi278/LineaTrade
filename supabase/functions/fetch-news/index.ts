// Noticias — Edge Function fetch-news. Agrega RSS de un puñado de fuentes de
// trading/finanzas en la tabla global news_articles y sirve el listado. Sin
// pg_cron/pg_net en este archivo (ver migración 20260721130000): el refresh
// ocurre on-demand, la primera vez que alguien abre /noticias después de que
// el cache quedó viejo (ver STALE_MS más abajo), o via pg_cron que invoca esta
// misma función con header X-Cron-Secret en horarios clave de mercado.
//
// 2026-07-21 — extensión:
// - Soporta fuentes no-RSS (GDELT, CryptoCompare, CoinGecko) detectadas por
//   scheme especial en NEWS_FEEDS.url (gdelt://, cryptocompare://, coingecko://).
// - Header X-Cron-Secret: si matchea env NEWS_CRON_SECRET, força refresh
//   ignorando STALE_MS — usado por pg_cron en horarios de mercado.
// - Pre-warm de bodies: siX-Cron-Secret presente, despues del refresh de
//   feeds invoca fetch-article-body async para los top 20 artículos nuevos
//   (no bloquea la respuesta — son jobs en fire-and-forget).
//
// Mismo esqueleto que analyze-trade: CORS estático, chequeo manual del header
// Authorization (o X-Cron-Secret para cron interno), userClient solo para
// confirmar sesión valida (no hace falta más — las noticias no son datos por
// usuario), serviceClient para leer/escribir news_articles (bypassa la RLS).
import Parser from 'npm:rss-parser@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabaseClients.ts'
import { NEWS_FEEDS, type FetchNewsResponse, type NewsArticleDTO, type NewsFeedSource } from '../_shared/newsTypes.ts'

const STALE_MS = 25 * 60 * 1000
const MAX_ARTICLES_RETURNED = 120

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ArticleUpsertRow {
  source_name: string
  category: string
  title: string
  url: string
  summary: string | null
  image_url: string | null
  published_at: string
  fetched_at: string
}

async function fetchRssFeed(parser: Parser, feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'LineaTradeBot/1.0 (+https://lineartrade.vercel.app)' } })
  if (!res.ok) throw new Error(`${feed.url} respondió ${res.status}`)
  const xml = await res.text()
  const parsed = await parser.parseString(xml)

  return (parsed.items ?? []).map((item) => ({
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.link ?? '',
    // 800 chars: la vista de detalle (/noticias/:id) muestra este campo completo.
    // Si la fuente es fair-use-reprint, fetch-article-body reemplaza este
    // resumen por el excerpt scrapeado (texto plano) al abrir la nota; el
    // `summary` del feed sigue siendo el fallback/snippet-only de base.
    summary: item.contentSnippet ? item.contentSnippet.slice(0, 800) : null,
    image_url: item.enclosure?.url ?? null,
    published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
    fetched_at: new Date().toISOString(),
  }))
}

/** GDELT 2.0 artlist — formato RSS via API abierta. */
async function fetchGdeltFeed(feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  const res = await fetch(feed.url.replace('gdelt://', 'https://api.gdeltproject.org/'), {
    headers: { 'User-Agent': 'LineaTradeBot/1.0' },
  })
  if (!res.ok) throw new Error(`GDELT respondió ${res.status}`)
  const xml = await res.text()
  const parser = new Parser()
  const parsed = await parser.parseString(xml)
  return (parsed.items ?? []).map((item) => ({
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.link ?? '',
    summary: item.contentSnippet ? item.contentSnippet.slice(0, 800) : null,
    image_url: item.enclosure?.url ?? null,
    published_at: item.isoDate ?? new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }))
}

/** CryptoCompare News API (público, sin key). */
async function fetchCryptoCompareFeed(feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  const res = await fetch('https://min-api.cryptocompare.com' + feed.url.replace('cryptocompare://', ''), {
    headers: { 'User-Agent': 'LineaTradeBot/1.0' },
  })
  if (!res.ok) throw new Error(`CryptoCompare respondió ${res.status}`)
  const data = await res.json() as { Data?: Array<{ id?: string; title?: string; url?: string; body?: string; source?: string; imageurl?: string; published_on?: number }> }
  return (data.Data ?? []).map((item) => ({
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.url ?? '',
    summary: item.body ? item.body.slice(0, 800) : null,
    image_url: item.imageurl ?? null,
    published_at: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }))
}

/** CoinGecko news endpoint (público). */
async function fetchCoinGeckoFeed(feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  const res = await fetch('https://api.coingecko.com' + feed.url.replace('coingecko://', ''), {
    headers: { 'User-Agent': 'LineaTradeBot/1.0', accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`CoinGecko respondió ${res.status}`)
  const data = await res.json() as Array<{ title?: string; url?: string; author?: string; updated_at?: string; thumb?: string; thumb_2?: string }>
  return (data ?? []).map((item) => ({
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.url ?? '',
    summary: null, // CoinGecko news API no devuelve body, sólo metadatos.
    image_url: item.thumb ?? item.thumb_2 ?? null,
    published_at: item.updated_at ? new Date(item.updated_at).toISOString() : new Date().toISOString(),
    fetched_at: new Date().toISOString(),
  }))
}

async function fetchFeed(parser: Parser, feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  if (feed.url.startsWith('gdelt://')) return fetchGdeltFeed(feed)
  if (feed.url.startsWith('cryptocompare://')) return fetchCryptoCompareFeed(feed)
  if (feed.url.startsWith('coingecko://')) return fetchCoinGeckoFeed(feed)
  return fetchRssFeed(parser, feed)
}

/** Pre-warm de bodies de los top N artículos — fire-and-forget, no bloquea. */
async function prewarmBodies(serviceClient: ReturnType<typeof createServiceClient>, articleIds: string[]): Promise<void> {
  const cronSecret = Deno.env.get('NEWS_CRON_SECRET')
  if (!cronSecret) return // no podemos invocar fetch-article-body sin secret internamente
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fetch-article-body`
  // El gateway de Supabase valida verify_jwt ANTES de que el código de la
  // función corra — sin un Authorization Bearer con un JWT válido, esta
  // llamada nunca llega a fetch-article-body, sin importar X-Cron-Secret.
  // Mismo patrón que invoke_news_cron_refresh() en la migración de cron:
  // el anon key es un JWT válido a nivel gateway; X-Cron-Secret es lo que
  // fetch-article-body usa para saltarse la validación de sesión de usuario.
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  // No esperamos — lanzamos y seguimos. Edge Function timeout wall: 150s free.
  await Promise.allSettled(
    articleIds.map((id) =>
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          'X-Cron-Secret': cronSecret,
        },
        body: JSON.stringify({ article_id: id }),
      }).catch(() => {}),
    ),
  )
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: cron interno via X-Cron-Secret, o sesión valida via Authorization.
  const cronSecret = Deno.env.get('NEWS_CRON_SECRET')
  const providedCronSecret = req.headers.get('X-Cron-Secret')
  const isCronInternal = !!(cronSecret && providedCronSecret && providedCronSecret === cronSecret)

  const authHeader = req.headers.get('Authorization')
  if (!isCronInternal && !authHeader) {
    return errorResponse(401, 'Falta el header Authorization.')
  }

  if (!isCronInternal && authHeader) {
    const userClient = createUserClient(authHeader)
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) {
      return errorResponse(401, 'Sesión inválida o expirada.')
    }
  }

  const serviceClient = createServiceClient()

  const { data: latest } = await serviceClient
    .from('news_articles')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isStale = !latest || Date.now() - new Date(latest.fetched_at).getTime() > STALE_MS

  let partial = false
  let refreshed = false

  if (isStale || isCronInternal) {
    refreshed = true
    const parser = new Parser()
    const results = await Promise.allSettled(NEWS_FEEDS.map((feed) => fetchFeed(parser, feed)))

    const rows = results.flatMap((result) => {
      if (result.status === 'fulfilled') return result.value
      partial = true
      return []
    })

    const validRows = rows.filter((row) => row.url.length > 0)
    if (validRows.length > 0) {
      const { error: upsertError } = await serviceClient
        .from('news_articles')
        .upsert(validRows, { onConflict: 'url' })
      if (upsertError && rows.length === validRows.length) {
        partial = true
      }
    } else {
      partial = true
    }

    // Pre-warm de bodies sólo en cron jobs (no on-demand para evitar amplify).
    if (isCronInternal && validRows.length > 0) {
      // Top 20 artículos más recientes — el scrapeo de bodies en jobs
      // programados significa que /noticias/:id abre al instante con cuerpo.
      // Necesitamos los article_ids (uuids); los validRows no los tienen hasta
      // que se hace el insert, así que re-leemos el top 20 de la BD.
      const { data: topArticles } = await serviceClient
        .from('news_articles')
        .select('id')
        .order('published_at', { ascending: false })
        .limit(20)
      if (topArticles && topArticles.length > 0) {
        // Fire-and-forget — no esperamos en el request principal.
        void prewarmBodies(serviceClient, topArticles.map((r) => (r as { id: string }).id))
      }
    }
  }

  const { data: articles, error: selectError } = await serviceClient
    .from('news_articles')
    .select('id, source_name, category, title, url, summary, image_url, published_at')
    .order('published_at', { ascending: false })
    .limit(MAX_ARTICLES_RETURNED)

  if (selectError) {
    return errorResponse(500, `No se pudo leer las noticias: ${selectError.message}`)
  }

  const responseBody: FetchNewsResponse = {
    articles: (articles ?? []) as NewsArticleDTO[],
    refreshed,
    partial,
  }

  return new Response(JSON.stringify(responseBody), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})