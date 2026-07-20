// Noticias — Edge Function fetch-news. Agrega RSS de un puñado de fuentes de
// trading/finanzas en la tabla global news_articles y sirve el listado. Sin
// pg_cron/pg_net (no hay precedente de scheduling en este proyecto): el
// refresh ocurre on-demand, la primera vez que alguien abre /noticias después
// de que el cache quedó viejo (ver STALE_MS más abajo).
//
// Mismo esqueleto que analyze-trade: CORS estático, chequeo manual del header
// Authorization, userClient solo para confirmar que hay sesión válida (no hace
// falta más — las noticias no son datos por usuario), serviceClient para
// leer/escribir news_articles (bypassa la RLS de solo-lectura de esa tabla).
import Parser from 'npm:rss-parser@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabaseClients.ts'
import { NEWS_FEEDS, type FetchNewsResponse, type NewsArticleDTO } from '../_shared/newsTypes.ts'

const STALE_MS = 25 * 60 * 1000
const MAX_ARTICLES_RETURNED = 120

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function fetchFeed(parser: Parser, feed: (typeof NEWS_FEEDS)[number]) {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'LineaTradeBot/1.0 (+https://lineartrade.vercel.app)' } })
  if (!res.ok) throw new Error(`${feed.url} respondió ${res.status}`)
  const xml = await res.text()
  const parsed = await parser.parseString(xml)

  return (parsed.items ?? []).map((item) => ({
    source_name: feed.sourceName,
    category: feed.category,
    title: item.title ?? '(sin título)',
    url: item.link ?? '',
    // 800 en vez de 320: la vista de detalle (/noticias/:id) muestra este campo
    // completo, no solo un recorte de card — pero sigue siendo únicamente el
    // resumen que el feed ya publica en <description>, nunca el cuerpo completo
    // del artículo (eso no está licenciado para redistribución, ver NoticiaDetail.tsx).
    summary: item.contentSnippet ? item.contentSnippet.slice(0, 800) : null,
    image_url: item.enclosure?.url ?? null,
    published_at: item.isoDate ?? (item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()),
    fetched_at: new Date().toISOString(),
  }))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse(401, 'Falta el header Authorization.')
  }

  const userClient = createUserClient(authHeader)
  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return errorResponse(401, 'Sesión inválida o expirada.')
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

  if (isStale) {
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
        // Si TODOS los feeds fallaron y encima el upsert falla, no hay nada
        // que devolver — en cualquier otro caso seguimos con lo que ya había
        // en caché.
        partial = true
      }
    } else {
      partial = true
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

  const body: FetchNewsResponse = {
    articles: (articles ?? []) as NewsArticleDTO[],
    refreshed,
    partial,
  }

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
