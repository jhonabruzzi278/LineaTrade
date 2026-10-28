// Noticias — Edge Function fetch-news. Agrega RSS de un puñado de fuentes de
// trading/finanzas en la tabla global news_articles y sirve el listado. Sin
// pg_cron/pg_net en este archivo (ver migración 20260721130000): el refresh
// ocurre on-demand, la primera vez que alguien abre /noticias después de que
// el cache quedó viejo (ver STALE_MS más abajo), o via pg_cron que invoca esta
// misma función con header X-Cron-Secret en horarios clave de mercado.
//
// - Header X-Cron-Secret fuerza refresh y pre-warm para pg_cron.
// - Cada feed tiene timeout y deja un resultado estructurado en logs.
// - Una petición autenticada puede enviar force_refresh para el botón Reintentar.
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
const FEED_TIMEOUT_MS = 12_000

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

type FeedItem = {
  enclosure?: { url?: string }
  'media:content'?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>
  'media:thumbnail'?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>
  content?: string
  contentSnippet?: string
  title?: string
  link?: string
  isoDate?: string
  pubDate?: string
}

function firstMediaUrl(value: FeedItem['media:content'] | FeedItem['media:thumbnail']): string | null {
  const media = Array.isArray(value) ? value[0] : value
  const url = media?.$?.url
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null
}

function imageFromHtml(html: string | undefined): string | null {
  if (!html) return null
  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i)
    ?? html.match(/<img\b[^>]*\bsrc\s*=\s*([^\s>]+)/i)
  const rawUrl = match?.[1]?.replace(/["']$/, '')
  if (!rawUrl) return null
  try {
    const url = new URL(rawUrl)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

function safeErrorMessage(error: unknown): string {
  let message: string
  if (error instanceof Error) {
    message = error.message
  } else if (error && typeof error === 'object') {
    // PostgREST errors are plain objects, not Error instances. String(error)
    // collapses them to the unhelpful "[object Object]".
    const value = error as Record<string, unknown>
    message = ['code', 'message', 'details', 'hint', 'status']
      .map((key) => value[key] == null ? '' : `${key}: ${String(value[key])}`)
      .filter(Boolean)
      .join(' | ') || 'Error sin detalle'
  } else {
    message = String(error)
  }
  return message
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[url]')
    .replace(/(api[_-]?key|token|secret)=([^&\s]+)/gi, '$1=[redacted]')
    .replace(/\bBearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/gi, '[redacted]')
    .slice(0, 240)
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FEED_TIMEOUT_MS)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Tiempo de espera agotado (${FEED_TIMEOUT_MS} ms)`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function fetchRssFeed(parser: Parser, feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
  const res = await fetchWithTimeout(feed.url, { headers: { 'User-Agent': 'LineaTradeBot/1.0 (+https://lineartrade.vercel.app)' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const xml = await res.text()
  const parsed = await parser.parseString(xml)

  return (parsed.items ?? []).map((rawItem) => {
    const item = rawItem as FeedItem
    const imageUrl = item.enclosure?.url
      ?? firstMediaUrl(item['media:content'])
      ?? firstMediaUrl(item['media:thumbnail'])
      ?? imageFromHtml(item.content)
      ?? imageFromHtml(item.contentSnippet)

    return {
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.link ?? '',
    // 800 chars: la vista de detalle (/noticias/:id) muestra este campo completo.
    // Si la fuente es fair-use-reprint, fetch-article-body reemplaza este
    // resumen por el excerpt scrapeado (texto plano) al abrir la nota; el
    // `summary` del feed sigue siendo el fallback/snippet-only de base.
    summary: item.contentSnippet ? item.contentSnippet.slice(0, 800) : null,
    image_url: imageUrl,
    published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
    fetched_at: new Date().toISOString(),
    }
  })
}

async function fetchFeed(parser: Parser, feed: NewsFeedSource): Promise<ArticleUpsertRow[]> {
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
      fetchWithTimeout(url, {
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

  const requestBody = req.method === 'POST' ? await req.clone().json().catch(() => null) as { force_refresh?: unknown } | null : null
  const forceRefresh = requestBody?.force_refresh === true

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

  if (isStale || isCronInternal || forceRefresh) {
    refreshed = true
    const parser = new Parser()
    const refreshStartedAt = performance.now()
    const feedStartedAt = NEWS_FEEDS.map(() => performance.now())
    const results = await Promise.allSettled(NEWS_FEEDS.map((feed) => fetchFeed(parser, feed)))

    const rows: ArticleUpsertRow[] = []
    let successfulFeeds = 0
    let emptyFeeds = 0
    let failedFeeds = 0
    for (const [index, result] of results.entries()) {
      const feed = NEWS_FEEDS[index]
      const durationMs = Math.round(performance.now() - feedStartedAt[index])
      if (result.status === 'rejected') {
        failedFeeds += 1
        partial = true
        console.error(JSON.stringify({
          event: 'news_feed_result',
          source: feed.sourceName,
          status: 'error',
          duration_ms: durationMs,
          error: safeErrorMessage(result.reason),
        }))
        continue
      }

      const feedRows = result.value
      const validFeedRows = feedRows.filter((row) => row.url.length > 0)
      rows.push(...feedRows)
      if (validFeedRows.length === 0) {
        emptyFeeds += 1
        partial = true
        console.warn(JSON.stringify({
          event: 'news_feed_result',
          source: feed.sourceName,
          status: 'empty',
          articles_received: feedRows.length,
          valid_articles: 0,
          duration_ms: durationMs,
        }))
      } else {
        successfulFeeds += 1
        console.info(JSON.stringify({
          event: 'news_feed_result',
          source: feed.sourceName,
          status: 'ok',
          articles_received: feedRows.length,
          valid_articles: validFeedRows.length,
          duration_ms: durationMs,
        }))
      }
    }

    const fetchedValidRows = rows.filter((row) => row.url.length > 0)
    const rowsByUrl = new Map<string, ArticleUpsertRow>()
    for (const row of fetchedValidRows) {
      const existing = rowsByUrl.get(row.url)
      if (!existing || Date.parse(row.published_at) > Date.parse(existing.published_at)) {
        rowsByUrl.set(row.url, row)
      }
    }
    // Postgres cannot apply ON CONFLICT DO UPDATE to the same URL twice in
    // one INSERT. Several feeds can syndicate the same story, so collapse the
    // batch to one deterministic (newest) row per URL before the upsert.
    const validRows = [...rowsByUrl.values()]
    const duplicateRowsRemoved = fetchedValidRows.length - validRows.length
    let upsertSucceeded = false
    if (validRows.length > 0) {
      const { error: upsertError } = await serviceClient
        .from('news_articles')
        .upsert(validRows, { onConflict: 'url' })
      if (upsertError) {
        partial = true
        console.error(JSON.stringify({
          event: 'news_upsert_result',
          status: 'error',
          submitted_rows: validRows.length,
          error: safeErrorMessage(upsertError),
        }))
      } else {
        upsertSucceeded = true
        console.info(JSON.stringify({
          event: 'news_upsert_result',
          status: 'ok',
          submitted_rows: validRows.length,
        }))
      }
    } else {
      partial = true
    }

    console.info(JSON.stringify({
      event: 'news_refresh_complete',
      trigger: isCronInternal ? 'cron' : forceRefresh ? 'manual_retry' : 'on_demand',
      feeds_total: NEWS_FEEDS.length,
      feeds_ok: successfulFeeds,
      feeds_empty: emptyFeeds,
      feeds_failed: failedFeeds,
      articles_received: rows.length,
      valid_articles: validRows.length,
      duplicate_rows_removed: duplicateRowsRemoved,
      upsert_succeeded: upsertSucceeded,
      partial,
      duration_ms: Math.round(performance.now() - refreshStartedAt),
    }))

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
  } else {
    console.info(JSON.stringify({ event: 'news_refresh_skipped', reason: 'cache_fresh' }))
  }

  const { data: articles, error: selectError } = await serviceClient
    .from('news_articles')
    .select('id, source_name, category, title, url, summary, image_url, published_at')
    .order('published_at', { ascending: false })
    .limit(MAX_ARTICLES_RETURNED)

  if (selectError) {
    console.error(JSON.stringify({ event: 'news_read_error', error: safeErrorMessage(selectError) }))
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
