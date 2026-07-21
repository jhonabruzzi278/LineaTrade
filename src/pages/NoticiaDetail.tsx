import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { SourceAvatar } from '../components/SourceAvatar'
import { useToast } from '../lib/toast'
import {
  getNewsArticleById,
  getAdjacentArticleIds,
  getRelatedArticles,
  getArticleBody,
  getCachedArticleBody,
  timeAgo,
  formatPublished,
  formatListTimestamp,
  splitIntoParagraphs,
  NEWS_CATEGORY_LABELS,
  BODY_LICENSE_LABELS,
  type NewsArticle,
  type ArticleBody,
} from '../lib/news'

// Umbral en px para que un touchmove horizontal cuente como swipe de
// navegación en vez de un scroll/tap accidental.
const SWIPE_THRESHOLD_PX = 60

// Lector full-screen, estilo "una noticia a la vez" (swipe horizontal entre
// notas, scroll vertical dentro de cada una) — a pedido explícito del
// usuario, inspirado en apps de noticias tipo TikTok/Apple News. Por eso NO
// renderiza <AppHeader/>/<AppFloatingNav/>: es una toma de pantalla completa,
// modo foco, mismo criterio que <WizardLayout/> en Onboarding/NuevoTrade (ver
// CLAUDE.md) — la navegación global no tiene sentido acá, la salida es el
// breadcrumb "Noticias" propio de esta pantalla.
//
// 2026-07-21 — el contenido ahora va más allá del summary del feed: para
// fuentes `fair-use-reprint` (ver supabase/functions/_shared/newsTypes.ts),
// fetch-article-body scrapea sólo h1 + primer párrafo (texto plano) del
// sitio propio de la fuente. Para `rss-snippet-only` (paywalls, ToS
// restrictivos, o agregadores que no controlan el dominio destino) sigue
// solo con el summary del feed. Deliberadamente NO hay un tier de "cuerpo
// completo" — este producto nunca republica el artículo entero. El CTA
// externo "Leer la nota completa en {fuente}" permanece SIEMPRE — es el
// salvavidas legal para ambos tiers.
export default function NoticiaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [related, setRelated] = useState<NewsArticle[]>([])
  const [adjacent, setAdjacent] = useState<{ prevId: string | null; nextId: string | null }>({
    prevId: null,
    nextId: null,
  })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [body, setBody] = useState<ArticleBody | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyReason, setBodyReason] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      const found = await getNewsArticleById(id!)
      if (cancelled) return
      if (!found) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setArticle(found)
      setAdjacent(getAdjacentArticleIds(found.id))
      setLoading(false)
      const relatedArticles = await getRelatedArticles(found.category, found.id)
      if (!cancelled) setRelated(relatedArticles)

      // Lazy load del cuerpo — nunca bloquea el render principal (título,
      // imagen, summary siempre están primero). Si ya hay body cacheado
      // en memoria lo usamos al instante, si no invocamos fetch-article-body.
      const cachedBody = getCachedArticleBody(found.id)
      if (cachedBody) {
        setBody(cachedBody.body)
        setBodyReason(cachedBody.reason)
        return
      }
      setBodyLoading(true)
      const bodyResult = await getArticleBody(found.id)
      if (cancelled) return
      if (bodyResult.ok) {
        setBody(bodyResult.body)
        setBodyReason(bodyResult.reason)
      } else {
        setBodyError(bodyResult.message)
      }
      setBodyLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [id])

  // Volver arriba al cambiar de nota (swipe o flechas) — sin esto, pasar de
  // una noticia larga (scrolleada hasta el final) a la siguiente la abre a
  // mitad de página en vez de por el título.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [id])

  async function handleShare() {
    const shareUrl = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: article?.title, url: shareUrl })
      } catch {
        // Usuario canceló el share sheet — no es un error, no hace falta feedback.
      }
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    showToast('Link copiado.', 'success')
  }

  // Swipe horizontal para pasar a la noticia anterior/siguiente dentro del
  // mismo orden en que aparecen en /noticias (ver getAdjacentArticleIds en
  // lib/news.ts) — silencioso si no hay vecino de ese lado (llegada directa
  // sin pasar por la lista, o extremo del listado).
  function handleTouchStart(e: TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD_PX) return
    const targetId = delta < 0 ? adjacent.nextId : adjacent.prevId
    if (targetId) navigate(`/noticias/${targetId}`)
  }

  if (loading) {
    return (
      <div className="fixed inset-0 h-[100dvh] w-full bg-ink flex items-center justify-center">
        <p className="font-body text-[14px] text-text-muted">Cargando...</p>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="fixed inset-0 h-[100dvh] w-full bg-ink flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="font-body text-[15px] text-text-muted">No encontramos esta noticia.</p>
        <Link to="/noticias" className="font-body text-[14px] text-signal hover:text-signal-dim transition-colors">
          Volver a Noticias
        </Link>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 h-[100dvh] w-full bg-ink flex flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain px-6 pt-7 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* "‹ ›" navegan a la nota anterior/siguiente en el mismo orden del
            listado (ver getAdjacentArticleIds) — el gesto principal es el
            swipe horizontal sobre todo el contenido (handleTouchStart/End
            acá arriba), esto es el equivalente clicable/con teclado para
            quien no está en touch. Deshabilitado (no placeholder vacío)
            cuando no hay vecino de ese lado. */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/noticias"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] text-text-faint hover:text-signal transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M13 7H1M7 1 1 7l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Noticias
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={!adjacent.prevId}
              onClick={() => adjacent.prevId && navigate(`/noticias/${adjacent.prevId}`)}
              aria-label="Noticia anterior"
              title="Noticia anterior"
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-faint transition-colors hover:text-text-primary hover:bg-panel-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 1 3 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              disabled={!adjacent.nextId}
              onClick={() => adjacent.nextId && navigate(`/noticias/${adjacent.nextId}`)}
              aria-label="Siguiente noticia"
              title="Siguiente noticia"
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-faint transition-colors hover:text-text-primary hover:bg-panel-2 disabled:opacity-30 disabled:pointer-events-none"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 1 11 7l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Masthead de fuente — logo + nombre, como el crédito de agencia
            (Reuters, etc.) en la parte superior de una nota. El botón de
            compartir vive acá (no abajo, junto al CTA) para que el CTA de
            "leer completa" pueda ocupar todo el ancho como acción principal. */}
        <div className="flex items-center justify-between gap-2 mb-5">
          <div className="flex items-center gap-2 min-w-0">
            <SourceAvatar name={article.source_name} size="md" />
            <span className="font-mono text-[13px] font-bold text-text-primary uppercase tracking-wide truncate">
              {article.source_name}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Compartir"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-hairline text-text-muted hover:text-text-primary hover:border-text-faint transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
            </svg>
          </button>
        </div>

        <h1 className="font-body text-[26px] md:text-[30px] font-bold text-text-primary leading-[1.25] mb-3">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center gap-2 mb-7">
          <span className="font-mono text-[12px] text-text-faint" title={formatPublished(article.published_at)}>
            {formatListTimestamp(article.published_at)} · {timeAgo(article.published_at)}
          </span>
          <span className="w-1 h-1 rounded-full bg-hairline" />
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-sm border border-hairline text-text-muted">
            {NEWS_CATEGORY_LABELS[article.category]}
          </span>
        </div>

        {article.image_url && (
          <div className="relative w-full aspect-[16/9] rounded-sm overflow-hidden border border-hairline bg-panel-2 mb-7">
            <img
              src={article.image_url}
              alt=""
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>
        )}

        {/* Cuerpo de lectura — 2 modes según tier de licencia del body
            (deliberadamente sólo 2, nunca cuerpo completo — ver el
            comentario de LicenseTier en supabase/functions/_shared/newsTypes.ts):
            1. fair-use-reprint: renderizamos body_text como párrafos (sólo
               h1 + primer párrafo del original, texto plano, defendible fair
               use). Atribución + CTA externo obligatorio. El frontend NUNCA
               decide qué tier toca — lo dicta el Edge Function según
               NEWS_FEEDS. body_text es siempre texto plano, nunca HTML del
               sitio scrapeado — no hay dangerouslySetInnerHTML en esta
               página ni en ninguna otra: contenido de terceros no confiable
               nunca se inyecta como HTML crudo.
            2. rss-snippet-only o body null todavía no scrapeado: cae al
               `summary` del feed (mismo render de antes, splitIntoParagraphs).
               Pre-fetch on-demand si fetch-article-body todavía no hizo
               pre-warm del top (raro: el detalle abre desde /noticias donde
               fetch-news ya corrió).
            Si bodyLoading está activo (primer detalle sin cache), mostramos
            el summary sin esperar — el cuerpo scrapeado se "swap-in" cuando
            llega, sin saltos visuales porque el bloque ocupa similar height. */}
        {body && body.body_text && body.content_license === 'fair-use-reprint' && (
          <>
            <div className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-wider text-text-faint">
              <span className="px-2 py-1 rounded-sm border border-hairline">{BODY_LICENSE_LABELS[body.content_license]}</span>
              <span>vía {article.source_name}</span>
            </div>
            <div className="space-y-4 mb-4">
              {splitIntoParagraphs(body.body_text).map((paragraph, i) => (
                <p key={i} className="font-body text-[16px] text-text-muted leading-[1.7]">
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="font-mono text-[11px] text-text-faint mb-8 italic">
              Extracto atribuido a {article.source_name}. Nota completa debajo.
            </p>
          </>
        )}

        {(!body || (body.content_license === 'rss-snippet-only')) && article.summary && (
          <>
            {bodyReason === 'snippet-only' && (
              <div className="flex items-center gap-2 mb-3 font-mono text-[10px] uppercase tracking-wider text-text-faint">
                <span className="px-2 py-1 rounded-sm border border-hairline">Solo resumen del feed</span>
                <span>vía {article.source_name}</span>
              </div>
            )}
            <div className="space-y-4 mb-8">
              {splitIntoParagraphs(article.summary).map((paragraph, i) => (
                <p key={i} className="font-body text-[16px] text-text-muted leading-[1.7]">
                  {paragraph}
                </p>
              ))}
            </div>
          </>
        )}

        {bodyLoading && !body && article.summary && (
          <p className="font-mono text-[11px] text-text-faint mb-4 animate-pulse">
            Cargando cuerpo…
          </p>
        )}

        {bodyError && (
          <p className="font-mono text-[11px] text-loss/70 mb-6">
            No se pudo cargar el cuerpo completo — mostrando el resumen.
          </p>
        )}

        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 font-body text-[15px] px-5 py-4 rounded-sm bg-signal text-ink font-semibold transition-all duration-200 hover:bg-signal-dim hover:shadow-glow mb-10"
        >
          Leer la nota completa en {article.source_name}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 11 11 3M11 3H5M11 3v6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>

        {related.length > 0 && (
          <>
            <div className="border-t border-hairline pt-8 mb-5">
              <p className="font-mono text-[11px] text-text-faint uppercase tracking-wider">
                Más de {NEWS_CATEGORY_LABELS[article.category]}
              </p>
            </div>
            <div className="space-y-5">
              {related.map((item) => (
                <Link
                  key={item.id}
                  to={`/noticias/${item.id}`}
                  className="group flex items-center gap-4 p-2 -m-2 rounded-sm transition-colors hover:bg-panel-2/50"
                >
                  <div className="relative w-20 h-20 shrink-0 rounded-sm overflow-hidden border border-hairline bg-panel-2">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-mono text-[9px] text-text-faint">{item.source_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-mono text-[11px] text-text-faint mb-1">
                      <SourceAvatar name={item.source_name} />
                      {item.source_name} · {timeAgo(item.published_at)}
                    </p>
                    <h3 className="font-serif text-[15px] font-bold text-text-primary leading-[1.3] line-clamp-2 group-hover:text-signal transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="h-6" />
      </div>

      {/* Barra inferior fija — controles siempre accesibles aunque el
          contenido de arriba (largo, en artículos con mucho `summary`) esté
          scrolleado lejos del breadcrumb. `env(safe-area-inset-bottom)`
          mismo criterio que <AppFloatingNav/> para no quedar debajo de la
          gesture bar en la PWA/TWA instalada. */}
      <div
        className="shrink-0 flex items-center justify-between border-t border-hairline bg-panel/95 backdrop-blur-md px-5 py-3"
        style={{ paddingBottom: 'max(0.75rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
      >
        <Link
          to="/noticias"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] text-text-faint hover:text-signal transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M13 7H1M7 1 1 7l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Noticias
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!adjacent.prevId}
            onClick={() => adjacent.prevId && navigate(`/noticias/${adjacent.prevId}`)}
            aria-label="Noticia anterior"
            title="Noticia anterior"
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-faint transition-colors hover:text-text-primary hover:bg-panel-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M9 1 3 7l6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            disabled={!adjacent.nextId}
            onClick={() => adjacent.nextId && navigate(`/noticias/${adjacent.nextId}`)}
            aria-label="Siguiente noticia"
            title="Siguiente noticia"
            className="w-9 h-9 flex items-center justify-center rounded-full text-text-faint transition-colors hover:text-text-primary hover:bg-panel-2 disabled:opacity-30 disabled:pointer-events-none"
          >
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M5 1 11 7l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
