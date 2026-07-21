import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { SourceAvatar } from '../components/SourceAvatar'
import { useToast } from '../lib/toast'
import {
  getNewsArticleById,
  getAdjacentArticleIds,
  getRelatedArticles,
  timeAgo,
  formatPublished,
  formatListTimestamp,
  splitIntoKeyPoints,
  NEWS_CATEGORY_LABELS,
  type NewsArticle,
} from '../lib/news'

// Umbral en px para que un touchmove horizontal cuente como swipe de
// navegación en vez de un scroll/tap accidental.
const SWIPE_THRESHOLD_PX = 60

// Vista de lectura en la app — pero solo hasta donde el feed RSS realmente licencia:
// título + resumen (`summary`, el <description> que la fuente ya publica para
// sindicación) + imagen provista por la fuente. El cuerpo completo del artículo vive en
// el sitio original — reproducirlo acá no está autorizado por ningún feed RSS, así que el
// CTA hacia la fuente es una pieza necesaria de esta pantalla, no un adorno.
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
  const touchStartX = useRef<number | null>(null)

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
    }

    void load()
    return () => {
      cancelled = true
    }
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
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-6 py-10 pb-28">
          <p className="font-body text-[14px] text-text-muted">Cargando...</p>
        </main>
        <AppFloatingNav />
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-6 py-10 pb-28 text-center">
          <p className="font-body text-[15px] text-text-muted mb-4">No encontramos esta noticia.</p>
          <Link to="/noticias" className="font-body text-[14px] text-signal hover:text-signal-dim transition-colors">
            Volver a Noticias
          </Link>
        </main>
        <AppFloatingNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main
        className="max-w-2xl mx-auto px-6 py-8 pb-28"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* "‹ ›" navegan a la nota anterior/siguiente en el mismo orden del
            listado (ver getAdjacentArticleIds) — el gesto principal es el
            swipe horizontal sobre todo el contenido (handleTouchStart/End
            en <main>), esto es el equivalente clicable/con teclado para
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

        {/* Imagen deliberadamente chica (antes: hero a todo ancho en 16:10) —
            acá es solo contexto visual, no el punto de la pantalla. El valor
            real es la extracción de "Puntos clave" de abajo, que ahora es lo
            que domina el espacio. */}
        {article.image_url && (
          <div className="relative w-full aspect-[21/9] max-h-[160px] rounded-sm overflow-hidden border border-hairline bg-panel-2 mb-6">
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

        {/* Puntos clave — el resumen del feed partido en oraciones, no una
            síntesis por IA (ver comentario de splitIntoKeyPoints en lib/news.ts).
            Envuelto en su propia tarjeta (antes: texto suelto sin fondo) para que
            sea lo primero que destaque en la pantalla, no la imagen. */}
        {article.summary && (
          <div className="rounded-sm border border-hairline bg-panel-2/60 px-5 py-5 mb-6">
            <p className="flex items-center gap-1.5 font-mono text-[12px] font-bold uppercase tracking-wider text-signal mb-4">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
              </svg>
              Puntos clave
            </p>
            <ul className="space-y-3.5">
              {splitIntoKeyPoints(article.summary).map((point, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 mt-[3px] text-signal">
                    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
                  </svg>
                  <span className="font-body text-[15px] text-text-primary leading-[1.6]">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA principal a todo ancho — antes competía por espacio con el botón
            de compartir en la misma fila; compartir ya se movió al masthead de
            arriba, así que esta es la única acción acá, la más prominente de
            la pantalla después de los puntos clave. */}
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
      </main>
      <AppFloatingNav />
    </div>
  )
}
