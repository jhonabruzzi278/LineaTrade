import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNav } from '../components/BottomNav'
import { useToast } from '../lib/toast'
import {
  getNewsArticleById,
  getRelatedArticles,
  timeAgo,
  formatPublished,
  NEWS_CATEGORY_LABELS,
  type NewsArticle,
} from '../lib/news'

// Vista de lectura en la app — pero solo hasta donde el feed RSS realmente licencia:
// título + resumen (`summary`, el <description> que la fuente ya publica para
// sindicación) + imagen provista por la fuente. El cuerpo completo del artículo vive en
// el sitio original — reproducirlo acá no está autorizado por ningún feed RSS, así que el
// CTA hacia la fuente es una pieza necesaria de esta pantalla, no un adorno.
export default function NoticiaDetail() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [article, setArticle] = useState<NewsArticle | null>(null)
  const [related, setRelated] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-6 py-10 pb-32">
          <p className="font-body text-[14px] text-text-muted">Cargando...</p>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="min-h-screen bg-ink">
        <AppHeader />
        <main className="max-w-2xl mx-auto px-6 py-10 pb-32 text-center">
          <p className="font-body text-[15px] text-text-muted mb-4">No encontramos esta noticia.</p>
          <Link to="/noticias" className="font-body text-[14px] text-signal hover:text-signal-dim transition-colors">
            Volver a Noticias
          </Link>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-2xl mx-auto px-6 py-8 pb-32">
        <Link
          to="/noticias"
          className="inline-flex items-center gap-1.5 font-mono text-[12px] text-text-faint hover:text-signal transition-colors mb-6"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M13 7H1M7 1 1 7l6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Noticias
        </Link>

        {article.image_url && (
          <div className="relative aspect-[16/10] rounded-sm overflow-hidden border border-hairline bg-panel-2 mb-6">
            <img src={article.image_url} alt="" className="w-full h-full object-cover" loading="eager" />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className="font-mono text-[11px] px-2 py-1 rounded-sm border border-signal/40 text-signal">
            {NEWS_CATEGORY_LABELS[article.category]}
          </span>
          <span className="font-mono text-[12px] text-text-muted">{article.source_name}</span>
          <span className="w-1 h-1 rounded-full bg-hairline" />
          <span className="font-mono text-[12px] text-text-faint" title={formatPublished(article.published_at)}>
            {timeAgo(article.published_at)}
          </span>
        </div>

        <h1 className="font-serif text-[26px] md:text-[32px] font-black text-text-primary leading-[1.2] mb-6">
          {article.title}
        </h1>

        {article.summary && (
          <p className="font-body text-[16px] text-text-muted leading-[1.7] whitespace-pre-line mb-8">
            {article.summary}
          </p>
        )}

        <div className="flex items-center gap-3 mb-10">
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 font-body text-[14px] px-5 py-3.5 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow"
          >
            Leer la nota completa en {article.source_name}
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 11 11 3M11 3H5M11 3v6"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => void handleShare()}
            aria-label="Compartir"
            className="shrink-0 w-[52px] h-[52px] flex items-center justify-center rounded-sm border border-hairline text-text-muted hover:text-text-primary hover:border-text-faint transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <path d="M8.6 13.5 15.4 17.5M15.4 6.5 8.6 10.5" />
            </svg>
          </button>
        </div>

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
                      <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-mono text-[9px] text-text-faint">{item.source_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-text-faint mb-1">
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
      <BottomNav />
    </div>
  )
}
