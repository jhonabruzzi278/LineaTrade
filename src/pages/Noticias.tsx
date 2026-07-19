import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { BottomNav } from '../components/BottomNav'
import { fetchNews, NEWS_CATEGORY_LABELS, type NewsArticle, type NewsCategory } from '../lib/news'

type CategoryFilter = 'all' | NewsCategory
const CATEGORY_FILTERS: CategoryFilter[] = ['all', 'cripto', 'forex', 'acciones', 'futuros', 'general', 'otro']

function formatPublished(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

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

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 pb-32">
        <p className="font-mono text-[13px] text-signal mb-2">actualidad de mercado</p>
        <h1 className="font-display text-[28px] text-text-primary mb-2">Noticias</h1>
        <p className="font-mono text-[12px] text-text-faint mb-8">
          Selección de fuentes de trading y finanzas — no es asesoramiento, es contexto.
        </p>

        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}
        {!error && partial && (
          <p className="font-body text-[13px] text-text-faint mb-6">
            Algunas fuentes no respondieron esta vez — se muestra lo disponible.
          </p>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`shrink-0 font-mono text-[12px] px-3 py-2 rounded-sm border transition-colors ${
                categoryFilter === cat
                  ? 'border-signal/40 bg-signal/15 text-signal'
                  : 'border-hairline text-text-muted hover:text-text-primary hover:border-text-faint'
              }`}
            >
              {cat === 'all' ? 'Todas' : NEWS_CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && !error && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted">No hay noticias para este filtro todavía.</p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
            {filtered.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col gap-2 px-5 py-4 hover:bg-panel-2/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-sm border border-hairline text-text-faint">
                    {NEWS_CATEGORY_LABELS[article.category]}
                  </span>
                  <span className="font-mono text-[11px] text-text-faint">{article.source_name}</span>
                  <span className="font-mono text-[11px] text-text-faint ml-auto shrink-0">
                    {formatPublished(article.published_at)}
                  </span>
                </div>
                <p className="font-body text-[15px] text-text-primary group-hover:text-signal transition-colors">
                  {article.title}
                </p>
                {article.summary && <p className="font-body text-[13px] text-text-muted line-clamp-2">{article.summary}</p>}
              </a>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  )
}
