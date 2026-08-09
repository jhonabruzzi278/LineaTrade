import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { SourceAvatar } from '../components/SourceAvatar'
import {
  fetchNews,
  getCachedNews,
  formatListTimestamp,
  NEWS_CATEGORY_LABELS,
  type NewsArticle,
  type NewsCategory,
} from '../lib/news'
import { useSidebar } from '../lib/sidebar'
import { cn } from '@/lib/utils'

type CategoryFilter = 'all' | NewsCategory
const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'cripto', 'forex', 'acciones', 'tecnologia', 'futuros', 'general', 'otro']

export default function Noticias() {
  const { expanded } = useSidebar()
  // Se siembra desde el cache de sesión (lib/news.ts): al volver desde el
  // detalle la lista aparece al instante — el skeleton solo existe en la
  // primera visita de la sesión.
  const [articles, setArticles] = useState<NewsArticle[]>(() => getCachedNews()?.articles ?? [])
  const [loading, setLoading] = useState<boolean>(() => getCachedNews() === null)
  const [partial, setPartial] = useState<boolean>(() => getCachedNews()?.partial ?? false)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const result = await fetchNews()
      if (cancelled) return
      if (!result.ok) {
        setError(result.message)
        setLoading(false)
        return
      }
      setArticles(result.articles)
      setPartial(result.partial)
      setError(null)
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [attempt])

  function handleRetry() {
    setError(null)
    setLoading(articles.length === 0)
    setAttempt((n) => n + 1)
  }

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return articles
    return articles.filter((article) => article.category === categoryFilter)
  }, [articles, categoryFilter])

  const hasArticles = articles.length > 0

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main
        className={cn(
          'max-w-2xl lg:max-w-6xl mx-auto px-5 lg:px-8 pt-6 pb-28 lg:pb-10 transition-[padding-left] duration-200',
          expanded ? 'lg:pl-80' : 'lg:pl-24',
        )}
      >
        {/* Header — título compacto alineado a la izquierda, estilo feed de
            noticias densa (no el masthead editorial centrado anterior). */}
        <h1 className="font-body text-[28px] font-bold text-text-primary tracking-tight mb-4">Noticias</h1>

        {/* Error bloqueante solo si no hay nada que mostrar; con artículos ya
            cargados (cache), un refresh fallido degrada a una nota discreta. */}
        {error && !hasArticles && (
          <div className="mb-6 border border-loss/30 bg-loss/10 rounded-sm px-4 py-3 flex items-center justify-between gap-3">
            <p className="font-body text-[13px] text-loss">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="shrink-0 font-mono text-[12px] px-3 py-1.5 rounded-sm border border-loss/40 text-loss hover:bg-loss/10 transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}
        {error && hasArticles && (
          <p className="font-body text-[12px] text-text-faint mb-4">
            No se pudo actualizar — mostrando lo último disponible.{' '}
            <button type="button" onClick={handleRetry} className="text-signal hover:text-signal-dim transition-colors">
              Reintentar
            </button>
          </p>
        )}
        {!error && partial && (
          <p className="font-body text-[12px] text-text-faint mb-4">
            Algunas fuentes no respondieron — se muestra lo disponible.
          </p>
        )}

        {/* Category pills — mismo diseño visual en todas las pantallas. El
            único cambio es de layout: en mobile sigue siendo la fila
            scrolleable original; en desktop se envuelven y centran para que
            todas sean visibles y clicables con mouse (el scroll oculto las
            dejaba inalcanzables). Sin bordes ni estilos nuevos. */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-5 -mx-5 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:px-0 lg:overflow-visible lg:flex-wrap lg:justify-center lg:mb-8">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              aria-pressed={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 font-body text-[13px] px-3.5 py-2 rounded-full transition-colors ${
                categoryFilter === cat
                  ? 'bg-panel-2 text-text-primary font-semibold'
                  : 'text-text-faint hover:text-text-muted'
              }`}
            >
              {cat === 'all' ? 'Todo' : NEWS_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading && (
          <div className="divide-y divide-hairline animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="py-5 space-y-2.5">
                <div className="h-3 w-32 rounded-sm bg-panel-2" />
                <div className="h-4 w-full rounded-sm bg-panel-2" />
                <div className="h-4 w-2/3 rounded-sm bg-panel-2" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-12 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted">No hay noticias para este filtro todavía.</p>
          </div>
        )}

        {/* Lista densa, tipo wire de noticias — sin imágenes, una fila por
            artículo: timestamp + fuente, luego titular en negrita.
            SOLO MOBILE (el diseño desktop vive en el bloque de abajo). */}
        {!loading && filtered.length > 0 && (
          <div className="divide-y divide-hairline lg:hidden">
            {filtered.map((article) => (
              <Link key={article.id} to={`/noticias/${article.id}`} className="group flex items-start gap-3 py-5">
                {article.image_url ? (
                  <div className="shrink-0 w-16 h-16 rounded-sm overflow-hidden border border-hairline bg-panel-2">
                    <img
                      src={article.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="shrink-0 pt-0.5">
                    <SourceAvatar name={article.source_name} size="md" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-text-faint mb-1.5">
                    {formatListTimestamp(article.published_at)} · {article.source_name}
                  </p>
                  <h2 className="font-body text-[15px] font-semibold text-text-primary leading-[1.35] group-hover:text-signal transition-colors duration-200">
                    {article.title}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* SOLO DESKTOP — plataforma de noticias: primer artículo destacado
            (imagen + titular grande) y el resto en grid de tarjetas. Llena el
            ancho del monitor en vez de dejar todo apretado en una columna. */}
        {!loading && filtered.length > 0 && (
          <div className="hidden lg:block">
            {/* Hero — primer artículo del filtro activo */}
            <Link
              to={`/noticias/${filtered[0].id}`}
              className="group grid grid-cols-5 gap-8 items-stretch border border-hairline rounded-sm overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card hover:shadow-elevated transition-shadow duration-300 mb-10"
            >
              <div className="col-span-3 relative aspect-[16/9] bg-panel-2 overflow-hidden">
                {filtered[0].image_url ? (
                  <img
                    src={filtered[0].image_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="eager"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <SourceAvatar name={filtered[0].source_name} size="lg" />
                  </div>
                )}
                <span className="absolute top-3 left-3 font-mono text-[11px] px-2 py-1 rounded-sm bg-ink/80 text-signal backdrop-blur-sm border border-hairline">
                  {NEWS_CATEGORY_LABELS[filtered[0].category]}
                </span>
              </div>
              <div className="col-span-2 flex flex-col justify-center py-8 pr-8">
                <p className="font-mono text-[11px] text-text-faint mb-3">
                  {formatListTimestamp(filtered[0].published_at)} · {filtered[0].source_name}
                </p>
                <h2 className="font-body text-[24px] font-bold text-text-primary leading-[1.25] group-hover:text-signal transition-colors duration-200 mb-3">
                  {filtered[0].title}
                </h2>
                {filtered[0].summary && (
                  <p className="font-body text-[14px] text-text-muted leading-relaxed line-clamp-3">
                    {filtered[0].summary}
                  </p>
                )}
              </div>
            </Link>

            {/* Grid de tarjetas — resto de artículos */}
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-9">
              {filtered.slice(1).map((article) => (
                <Link key={article.id} to={`/noticias/${article.id}`} className="group flex flex-col gap-3">
                  <div className="relative aspect-[16/9] rounded-sm overflow-hidden border border-hairline bg-panel-2">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <SourceAvatar name={article.source_name} size="md" />
                      </div>
                    )}
                  </div>
                  <p className="font-mono text-[11px] text-text-faint">
                    <span className="text-signal">{NEWS_CATEGORY_LABELS[article.category]}</span>
                    {' · '}
                    {formatListTimestamp(article.published_at)}
                    {' · '}
                    {article.source_name}
                  </p>
                  <h3 className="font-body text-[16px] font-semibold text-text-primary leading-[1.35] group-hover:text-signal transition-colors duration-200">
                    {article.title}
                  </h3>
                  {article.summary && (
                    <p className="font-body text-[13px] text-text-muted leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <AppFloatingNav />
    </div>
  )
}
