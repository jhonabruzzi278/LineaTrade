import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, ExternalLink, Share2 } from 'lucide-react'
import { NewsThumb } from '../components/news/NewsThumb'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Tag } from '../components/ui/tag'
import { useToast } from '../lib/toast'
import {
  getNewsArticleById,
  getAdjacentArticleIds,
  getRelatedArticles,
  getArticleBody,
  getCachedArticleBody,
  formatPublished,
  splitIntoParagraphs,
  NEWS_CATEGORY_LABELS,
  BODY_LICENSE_LABELS,
  type NewsArticle,
  type ArticleBody,
} from '../lib/news'
import { formatRelativeTime, splitIntoKeyPoints } from '../lib/newsView'
import { cn } from '@/lib/utils'

// Umbral en px para que un movimiento horizontal cuente como swipe de navegación
// y no como un scroll o un toque accidental.
const SWIPE_THRESHOLD_PX = 60

const ICON_BUTTON =
  'inline-flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-panel hover:text-text-primary disabled:pointer-events-none disabled:opacity-30'

// Lector de una nota. Nunca republica el artículo completo: muestra el resumen del feed
// y, para fuentes `fair-use-reprint`, solo el primer párrafo que entrega el Edge Function
// fetch-article-body (texto plano, jamás HTML de terceros). El enlace «Leer la nota
// completa» a la fuente es siempre parte de la pantalla: es la vía legítima al texto íntegro.
export default function NoticiaDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [related, setRelated] = useState<NewsArticle[]>([])
  const [adjacent, setAdjacent] = useState<{ prevId: string | null; nextId: string | null }>({ prevId: null, nextId: null })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [body, setBody] = useState<ArticleBody | null>(null)
  const [bodyLoading, setBodyLoading] = useState(false)
  const [bodyReason, setBodyReason] = useState<string | null>(null)
  const [bodyError, setBodyError] = useState<string | null>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setNotFound(false)
      setBody(null)
      setBodyReason(null)
      setBodyError(null)
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

      // Carga diferida del cuerpo: nunca bloquea el título ni el resumen.
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

  // Al pasar a otra nota, volver arriba en lugar de abrirla a media página.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [id])

  async function handleShare() {
    const shareUrl = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: article?.title, url: shareUrl })
      } catch {
        // El usuario canceló el menú de compartir: no es un error.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(shareUrl)
      showToast('Enlace copiado.', 'success')
    } catch {
      showToast('No se pudo copiar el enlace.', 'error')
    }
  }

  // Swipe horizontal entre notas, en el mismo orden de /noticias (ver getAdjacentArticleIds).
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

  const backLink = (
    <Link to="/noticias" className="inline-flex min-h-11 items-center gap-1.5 font-body text-[14px] font-semibold text-text-faint hover:text-text-primary">
      <ArrowLeft size={16} aria-hidden="true" />
      Noticias
    </Link>
  )

  if (loading && !article) {
    return (
      <main className="mx-auto max-w-6xl px-5 pb-28 pt-4 lg:pb-12" aria-busy="true" aria-label="Cargando noticia">
        {backLink}
        <div className="mt-4 max-w-[720px] animate-pulse space-y-4">
          <div className="h-3 w-48 rounded bg-panel" />
          <div className="h-8 w-full rounded bg-panel" />
          <div className="h-8 w-2/3 rounded bg-panel" />
          <div className="h-[120px] rounded-xl bg-panel" />
        </div>
      </main>
    )
  }

  if (notFound || !article) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 pb-28 pt-24 text-center lg:pb-12">
        <p className="font-body text-[15px] text-text-muted">No encontramos esta noticia.</p>
        <Button asChild variant="outline">
          <Link to="/noticias">Volver a Noticias</Link>
        </Button>
      </main>
    )
  }

  const keyPoints = article.summary ? splitIntoKeyPoints(article.summary) : []
  const showReprint = Boolean(body && body.body_text && body.content_license === 'fair-use-reprint')
  const showSummary = (!body || body.content_license === 'rss-snippet-only') && Boolean(article.summary)

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-2 lg:pb-12 lg:pt-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="flex items-center justify-between">
        {backLink}
        <div className="flex items-center">
          <button type="button" disabled={!adjacent.prevId} onClick={() => adjacent.prevId && navigate(`/noticias/${adjacent.prevId}`)} aria-label="Noticia anterior" title="Noticia anterior" className={ICON_BUTTON}>
            <ChevronLeft size={20} aria-hidden="true" />
          </button>
          <button type="button" disabled={!adjacent.nextId} onClick={() => adjacent.nextId && navigate(`/noticias/${adjacent.nextId}`)} aria-label="Noticia siguiente" title="Noticia siguiente" className={ICON_BUTTON}>
            <ChevronRight size={20} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => void handleShare()} aria-label="Compartir" title="Compartir" className={ICON_BUTTON}>
            <Share2 size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-12">
        <article className="min-w-0 lg:max-w-[720px]">
          <p className="num flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-faint lg:text-[12px]">
            <b className="text-[10px] font-semibold uppercase tracking-[0.1em] text-steel">{NEWS_CATEGORY_LABELS[article.category]}</b>
            <span title={formatPublished(article.published_at)}>
              {article.source_name} · {formatRelativeTime(article.published_at)}
            </span>
          </p>
          <h1 className="font-display mt-3 text-[26px] leading-[1.15] text-text-primary lg:text-[38px] lg:leading-[1.12]">{article.title}</h1>

          <NewsThumb
            imageUrl={article.image_url}
            sourceName={article.source_name}
            showSource
            eager
            className="mt-[18px] h-[120px] rounded-xl lg:mt-[22px] lg:h-auto lg:max-h-[170px] lg:aspect-[21/8]"
          />

          {/* Cuerpo: extracto atribuido (fair-use-reprint) o, si no, el resumen del feed. */}
          {showReprint && body?.body_text && (
            <>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Tag>{BODY_LICENSE_LABELS[body.content_license]}</Tag>
                <span className="num text-[11px] text-text-faint">vía {article.source_name}</span>
              </div>
              <div className="mt-3 space-y-4">
                {splitIntoParagraphs(body.body_text).map((paragraph, i) => (
                  <p key={i} className="font-body text-[16px] leading-[1.7] text-text-muted lg:text-[17px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </>
          )}

          {showSummary && article.summary && (
            <div className="mt-5">
              {bodyReason === 'snippet-only' && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Tag>{BODY_LICENSE_LABELS['rss-snippet-only']}</Tag>
                  <span className="num text-[11px] text-text-faint">vía {article.source_name}</span>
                </div>
              )}
              <div className="space-y-4">
                {splitIntoParagraphs(article.summary).map((paragraph, i) => (
                  <p key={i} className="font-body text-[16px] leading-[1.7] text-text-muted lg:text-[17px]">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}

          {bodyLoading && !body && <p className="num mt-3 animate-pulse text-[11px] text-text-faint">Cargando extracto…</p>}
          {bodyError && <p className="mt-3 font-body text-[12px] text-text-faint">No se pudo cargar el extracto: se muestra el resumen del feed.</p>}

          {keyPoints.length > 0 && (
            <Card as="section" aria-labelledby="key-points" className="mt-5 px-[18px] py-4 lg:mt-[26px] lg:px-6 lg:py-5">
              <h2 id="key-points" className="label-mono !text-spark">
                Puntos clave
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-[18px] font-body text-[15px] leading-relaxed text-text-primary marker:text-text-faint lg:space-y-2.5 lg:text-[16px]">
                {keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <p className="mt-3 font-body text-[11px] text-text-faint lg:text-[12px]">Resumen de las primeras frases de la nota. No es una síntesis hecha por IA.</p>
            </Card>
          )}

          <Button asChild variant="cta" size="lg" className="mt-5 w-full whitespace-normal py-2 text-center lg:mt-6">
            <a href={article.url} target="_blank" rel="noopener noreferrer">
              Leer la nota completa en {article.source_name}
              <ExternalLink size={16} aria-hidden="true" />
            </a>
          </Button>
        </article>

        {related.length > 0 && (
          <aside aria-label={`Más de ${NEWS_CATEGORY_LABELS[article.category]}`} className={cn('mt-8 lg:sticky lg:top-6 lg:mt-0')}>
            <p className="label-mono">Más de {NEWS_CATEGORY_LABELS[article.category]}</p>
            <ul className="mt-2 divide-y divide-hairline">
              {related.map((item) => (
                <li key={item.id}>
                  <Link to={`/noticias/${item.id}`} className="group flex items-center gap-3.5 py-3.5">
                    <NewsThumb imageUrl={item.image_url} sourceName={item.source_name} className="h-14 w-14 shrink-0 rounded-lg" />
                    <div className="min-w-0">
                      <h3 className="line-clamp-3 font-body text-[14px] font-bold leading-[1.35] text-text-primary group-hover:text-steel">{item.title}</h3>
                      <p className="num mt-1.5 text-[11px] text-text-faint">
                        {item.source_name} · {formatRelativeTime(item.published_at)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </main>
  )
}
