// Noticias — Edge Function fetch-article-body. Dado un article_id, resuelve
// el tier de licencia de la fuente y, si el tier lo permite, scrapea un
// excerpt corto (encabezado + primer párrafo, texto plano) del sitio
// publicador y lo persiste en news_article_body. Si ya existe un body
// cacheado con fetched_at < 24h, lo devuelve sin tocar el sitio publicador
// (regla anti-abuso — ver BODY_CACHE_MS en newsTypes.ts).
//
// Sólo dos tiers (ver LicenseTier en _shared/newsTypes.ts) — deliberadamente
// no hay un tier "cuerpo completo": este producto nunca republica el
// artículo entero, sólo un excerpt corto con atribución + link obligatorio.
// - fair-use-reprint: extrae <h1> + primer <p> no vacío del <main>/<article>
//   como texto plano (nunca HTML crudo — ver nota de seguridad abajo).
// - rss-snippet-only: no hace scraping. Devuelve body null con reason
//   'snippet-only' — el cliente usa el summary del feed + CTA externo.
//
// Seguridad: el body persistido es SIEMPRE texto plano (.textContent, nunca
// innerHTML del sitio scrapeado). El frontend nunca usa
// dangerouslySetInnerHTML con este contenido — es HTML de un tercero no
// confiable, y Readability/extracción de contenido no es lo mismo que
// sanitización (no se agregó por eso: se eliminó la superficie de ataque en
// vez de intentar sanitizarla).
//
// Paywall / contenido insuficiente: si no se encuentra un párrafo utilizable
// de al menos MIN_FAIR_USE_CHARS, cae a snippet-only y persiste
// content_license = 'rss-snippet-only' para no reintentar el scrap en cada
// abertura de la nota.
//
// No requiere auth del usuario (la verificación se hace sobre la sesión que
// invoca), pero acepta un header X-Cron-Secret opcional que permite invocarla
// desde fetch-news (pre-warm de top artículos en cron jobs) sin JWT.

import { parseHTML } from 'npm:linkedom@0.18.4'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient } from '../_shared/supabaseClients.ts'
import {
  BODY_CACHE_MS,
  licenseTierForSource,
  robotsAllowedForSource,
  type ArticleBodyDTO,
  type FetchArticleBodyResponse,
  type LicenseTier,
} from '../_shared/newsTypes.ts'

// Umbral de artículo válido (fair-use): por lo menos una oración.
const MIN_FAIR_USE_CHARS = 80
const FETCH_TIMEOUT_MS = 15_000
const USER_AGENT = 'LineaTradeBot/1.0 (+https://lineartrade.vercel.app)'

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ArticleRow {
  id: string
  source_name: string
  url: string
  summary: string | null
}

interface CachedBodyRow {
  article_id: string
  body_text: string | null
  word_count: number | null
  content_license: LicenseTier
  source_url: string
  fetched_at: string
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timeout)
  }
}

/** Extracción fair-use: h1 + primer <p> del main/article, como texto plano. */
function extractFairUseSnippet(html: string): { bodyText: string; wordCount: number } | null {
  try {
    const { document } = parseHTML(html)
    const heading = document.querySelector('h1')?.textContent?.trim() ?? null
    // Primero buscar main / article, fallback a todos los <p>.
    const container = document.querySelector('main') ?? document.querySelector('article') ?? document
    const paragraphs = Array.from(container.querySelectorAll('p') as unknown as HTMLElement[])
    const firstParagraph = paragraphs
      .map((p) => (p.textContent ?? '').trim())
      .find((text) => text.length >= MIN_FAIR_USE_CHARS)
    if (!firstParagraph) return null
    const text = [heading, firstParagraph].filter(Boolean).join('\n\n')
    const words = text.split(/\s+/).filter(Boolean).length
    return { bodyText: text, wordCount: words }
  } catch {
    return null
  }
}

async function scrapeAndPersist(
  serviceClient: ReturnType<typeof createServiceClient>,
  article: ArticleRow,
  tier: LicenseTier,
): Promise<ArticleBodyDTO | null> {
  if (tier === 'rss-snippet-only') {
    // Persisto marker para que no reintente scrape en cada abertura — cached
    // snippet-only le dice al frontend "no esperes body".
    const { error } = await serviceClient.from('news_article_body').upsert({
      article_id: article.id,
      body_text: null,
      word_count: null,
      content_license: 'rss-snippet-only',
      source_url: article.url,
      fetched_at: new Date().toISOString(),
    })
    if (error) {
      console.error('upsert snippet-only marker failed:', error.message)
    }
    return null
  }

  let html: string
  try {
    html = await fetchHtml(article.url)
  } catch (err) {
    console.error('fetchHtml failed:', (err as Error).message)
    return null
  }

  const extracted = extractFairUseSnippet(html)

  if (!extracted) {
    // No hay nada utilizable — marker snippet-only para no reintentar.
    await serviceClient.from('news_article_body').upsert({
      article_id: article.id,
      body_text: null,
      word_count: null,
      content_license: 'rss-snippet-only',
      source_url: article.url,
      fetched_at: new Date().toISOString(),
    })
    return null
  }

  const { error: upsertError } = await serviceClient.from('news_article_body').upsert({
    article_id: article.id,
    body_text: extracted.bodyText,
    word_count: extracted.wordCount,
    content_license: 'fair-use-reprint',
    source_url: article.url,
    fetched_at: new Date().toISOString(),
  })
  if (upsertError) {
    console.error('upsert body failed:', upsertError.message)
    return null
  }

  return {
    article_id: article.id,
    body_text: extracted.bodyText,
    word_count: extracted.wordCount,
    content_license: 'fair-use-reprint',
    source_url: article.url,
    fetched_at: new Date().toISOString(),
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let body: { article_id?: string } | null = null
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'Cuerpo JSON inválido.')
  }
  const articleId = body?.article_id
  if (!articleId) {
    return errorResponse(400, 'Falta article_id.')
  }

  // Auth: si el header X-Cron-Secret matchea, permiso directo (uso interno).
  // si no, requiere sesión valida via Authorization.
  const cronSecret = Deno.env.get('NEWS_CRON_SECRET')
  const providedCronSecret = req.headers.get('X-Cron-Secret')
  const isCronInternal = cronSecret && providedCronSecret && providedCronSecret === cronSecret

  const authHeader = req.headers.get('Authorization')
  if (!isCronInternal && !authHeader) {
    return errorResponse(401, 'Falta el header Authorization.')
  }

  const serviceClient = createServiceClient()

  // Si authHeader presente, validamos sesión (no es necesario para cron interno).
  if (!isCronInternal && authHeader) {
    const userClient = createUserClient(authHeader)
    const {
      data: { user },
    } = await userClient.auth.getUser()
    if (!user) {
      return errorResponse(401, 'Sesión inválida o expirada.')
    }
  }

  // 1) Article existe?
  const { data: article, error: articleError } = await serviceClient
    .from('news_articles')
    .select('id, source_name, url, summary')
    .eq('id', articleId)
    .maybeSingle<ArticleRow>()

  if (articleError || !article) {
    return errorResponse(404, 'Artículo no encontrado.')
  }

  // 2) Cache hit?
  const { data: cached } = await serviceClient
    .from('news_article_body')
    .select('article_id, body_text, word_count, content_license, source_url, fetched_at')
    .eq('article_id', articleId)
    .maybeSingle<CachedBodyRow>()

  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < BODY_CACHE_MS) {
    const response: FetchArticleBodyResponse = {
      body: cached as ArticleBodyDTO,
      cached: true,
      reason: cached.content_license === 'rss-snippet-only' ? 'snippet-only' : null,
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3) Cache vencido o nuevo — scrapea segun tier.
  const tier = licenseTierForSource(article.source_name)
  if (!tier) {
    // Fuente desconocida (no listada en NEWS_FEEDS) — default snippets only.
    const response: FetchArticleBodyResponse = {
      body: null,
      cached: false,
      reason: 'unknown-source',
    }
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // robots.txt permit? si no, snippet-only.
  if (!robotsAllowedForSource(article.source_name)) {
    const response: FetchArticleBodyResponse = { body: null, cached: false, reason: 'robots-disallowed' }
    // Persistimos marker snippet-only para que no reintentemos.
    await serviceClient.from('news_article_body').upsert({
      article_id: article.id,
      body_text: null,
      word_count: null,
      content_license: 'rss-snippet-only',
      source_url: article.url,
      fetched_at: new Date().toISOString(),
    })
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const scraped = await scrapeAndPersist(serviceClient, article, tier)

  const response: FetchArticleBodyResponse = {
    body: scraped,
    cached: false,
    reason: scraped ? null : (tier === 'rss-snippet-only' ? 'snippet-only' : 'scrape-failed'),
  }
  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
