import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { BottomNav } from '../components/BottomNav'
import { fetchNews, timeAgo, NEWS_CATEGORY_LABELS, type NewsArticle, type NewsCategory } from '../lib/news'

type CategoryFilter = 'all' | NewsCategory
const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'cripto', 'forex', 'acciones', 'tecnologia', 'futuros', 'general', 'otro']

export default function Noticias() {
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [partial, setPartial] = useState(false)
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
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (categoryFilter === 'all') return articles
    return articles.filter((article) => article.category === categoryFilter)
  }, [articles, categoryFilter])

  const hero = filtered[0]
  const rest = filtered.slice(1)

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />

      <main className="max-w-5xl mx-auto px-6 pt-8 pb-32">
        {/* Masthead */}
        <div className="text-center mb-8">
          <p className="font-mono text-[11px] tracking-[0.25em] text-signal uppercase mb-2">
            Actualidad de mercado
          </p>
          <h1 className="font-serif text-[36px] md:text-[48px] font-black text-text-primary tracking-tight leading-[1.1]">
            Noticias
          </h1>
          <p className="font-body text-[13px] text-text-faint mt-2 max-w-md mx-auto">
            Selección de fuentes de trading y finanzas en español — no es asesoramiento, es contexto.
          </p>
        </div>

        {/* Error / partial */}
        {error && (
          <div className="mb-6 border border-loss/30 bg-loss/10 rounded-sm px-4 py-3">
            <p className="font-body text-[13px] text-loss">{error}</p>
          </div>
        )}
        {!error && partial && (
          <p className="font-body text-[12px] text-text-faint mb-6 text-center">
            Algunas fuentes no respondieron — se muestra lo disponible.
          </p>
        )}

        {/* Category nav — fila scrolleable de una sola línea en mobile (7 chips
            no entran en 375px; el wrap centrado dejaba una segunda línea coja),
            centrada y sin scroll en desktop donde sí sobra espacio. */}
        <div
          className="flex items-center gap-2 overflow-x-auto md:flex-wrap md:justify-center md:overflow-visible pb-1 mb-8 -mx-6 px-6 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 font-mono text-[11px] md:text-[12px] px-3 py-2 md:py-1.5 rounded-sm border transition-colors ${
                categoryFilter === cat
                  ? 'border-signal/40 bg-signal/15 text-signal'
                  : 'border-hairline text-text-muted hover:text-text-primary hover:border-text-faint'
              }`}
            >
              {cat === 'all' ? 'Todas' : NEWS_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Editorial hairline */}
        <div className="border-t border-hairline mb-8" />

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="md:col-span-2 lg:col-span-3 h-[300px] rounded-sm bg-panel-2" />
            <div className="h-40 rounded-sm bg-panel-2" />
            <div className="h-40 rounded-sm bg-panel-2" />
            <div className="h-40 rounded-sm bg-panel-2" />
            <div className="h-40 rounded-sm bg-panel-2 hidden lg:block" />
            <div className="h-40 rounded-sm bg-panel-2 hidden lg:block" />
            <div className="h-40 rounded-sm bg-panel-2 hidden lg:block" />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-12 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted">No hay noticias para este filtro todavía.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            {/* Hero article */}
            {hero && (
              <Link to={`/noticias/${hero.id}`} className="group block mb-10">
                <article className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-hairline rounded-sm overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card hover:shadow-elevated transition-shadow duration-300">
                  {/* Image */}
                  <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[340px] bg-panel-2 overflow-hidden">
                    {hero.image_url ? (
                      <img
                        src={hero.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-panel-2">
                        <span className="font-mono text-[12px] text-text-faint">{hero.source_name}</span>
                      </div>
                    )}
                    <span className="absolute top-3 left-3 font-mono text-[11px] px-2 py-1 rounded-sm bg-ink/80 text-signal backdrop-blur-sm border border-hairline">
                      {NEWS_CATEGORY_LABELS[hero.category]}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="flex flex-col justify-center px-6 py-6 md:px-8 md:py-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="font-mono text-[11px] text-signal">{hero.source_name}</span>
                      <span className="w-1 h-1 rounded-full bg-hairline" />
                      <span className="font-mono text-[11px] text-text-faint">{timeAgo(hero.published_at)}</span>
                    </div>
                    <h2 className="font-serif text-[22px] md:text-[26px] font-bold text-text-primary leading-[1.25] group-hover:text-signal transition-colors duration-300 mb-3">
                      {hero.title}
                    </h2>
                    {hero.summary && (
                      <p className="font-body text-[14px] text-text-muted leading-relaxed line-clamp-3">
                        {hero.summary}
                      </p>
                    )}
                    <div className="mt-5 flex items-center gap-1.5 text-signal">
                      <span className="font-mono text-[11px] uppercase tracking-wider">Leer noticia</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-[1px]">
                        <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </article>
              </Link>
            )}

            {/* Divider entre hero y grid */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex-1 border-t border-hairline" />
              <span className="font-mono text-[11px] text-text-faint uppercase tracking-wider shrink-0">
                Más noticias
              </span>
              <div className="flex-1 border-t border-hairline" />
            </div>

            {/* Grid editorial — 1 col en mobile, 2 en tablet, 3 en desktop ancho
                (aprovecha el max-w-5xl del contenedor en vez de estirar la
                misma columna que en mobile). */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 lg:gap-x-8 gap-y-10">
              {rest.map((article, i) => (
                <Link
                  key={article.id}
                  to={`/noticias/${article.id}`}
                  className="group flex flex-col gap-3"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  {/* Image thumbnail */}
                  <div className="relative aspect-[16/9] rounded-sm overflow-hidden border border-hairline bg-panel-2">
                    {article.image_url ? (
                      <img
                        src={article.image_url}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-panel-2">
                        <span className="font-mono text-[11px] text-text-faint">{article.source_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-sm border border-hairline text-signal">
                      {NEWS_CATEGORY_LABELS[article.category]}
                    </span>
                    <span className="font-mono text-[11px] text-text-faint">{article.source_name}</span>
                    <span className="font-mono text-[11px] text-text-faint ml-auto shrink-0">
                      {timeAgo(article.published_at)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif text-[17px] md:text-[18px] font-bold text-text-primary leading-[1.3] group-hover:text-signal transition-colors duration-300">
                    {article.title}
                  </h3>

                  {/* Summary */}
                  {article.summary && (
                    <p className="font-body text-[13px] text-text-muted leading-relaxed line-clamp-2">
                      {article.summary}
                    </p>
                  )}
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
