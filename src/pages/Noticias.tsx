import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CategoryPills, type CategoryFilter } from '../components/news/CategoryPills'
import { NewsThumb } from '../components/news/NewsThumb'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { PageHeader } from '../components/ui/page-header'
import { fetchNews, getCachedNews, NEWS_CATEGORY_LABELS, type NewsArticle } from '../lib/news'
import { formatRelativeTime } from '../lib/newsView'

function NewsMeta({ article, withCategory = true }: { article: NewsArticle; withCategory?: boolean }) {
  return (
    <p className="num text-[11px] text-text-faint">
      {withCategory && <b className="font-semibold uppercase tracking-[0.06em] text-steel">{NEWS_CATEGORY_LABELS[article.category]}</b>}
      {withCategory && ' · '}
      {article.source_name} · {formatRelativeTime(article.published_at)}
    </p>
  )
}

function NewsSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-hairline" aria-busy="true" aria-label="Cargando noticias">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex gap-3.5 py-4">
          <div className="flex-1 space-y-2.5">
            <div className="h-3 w-40 rounded bg-panel-2" />
            <div className="h-4 w-full rounded bg-panel-2" />
            <div className="h-4 w-2/3 rounded bg-panel-2" />
          </div>
          <div className="h-[72px] w-[72px] shrink-0 rounded-lg bg-panel-2" />
        </div>
      ))}
    </div>
  )
}

export default function Noticias() {
  // Se siembra desde el cache de sesión (lib/news.ts): al volver desde el detalle la lista
  // aparece al instante; el esqueleto solo existe en la primera visita de la sesión.
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

  const filtered = useMemo(
    () => (categoryFilter === 'all' ? articles : articles.filter((article) => article.category === categoryFilter)),
    [articles, categoryFilter],
  )
  const hasArticles = articles.length > 0
  const [hero, ...rest] = filtered

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <PageHeader kicker="contexto de mercado" title="Noticias" />

      <CategoryPills value={categoryFilter} onChange={setCategoryFilter} />

      {/* Error bloqueante solo si no hay nada que mostrar; con notas ya cargadas, un
          refresco fallido degrada a una nota discreta. */}
      {error && !hasArticles && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 border-loss/40" role="alert">
          <p className="font-body text-[14px] text-loss">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Reintentar
          </Button>
        </Card>
      )}
      {error && hasArticles && (
        <p className="mb-4 font-body text-[12px] text-text-faint">
          No se pudo actualizar: mostrando lo último disponible.{' '}
          <button type="button" onClick={handleRetry} className="font-semibold text-steel underline">
            Reintentar
          </button>
        </p>
      )}
      {!error && partial && <p className="mb-4 font-body text-[12px] text-text-faint">Algunas fuentes no respondieron: se muestra lo disponible.</p>}

      {loading && <NewsSkeleton />}

      {!loading && !error && filtered.length === 0 && (
        <Card tone="dashed" className="px-6 py-12 text-center">
          <p className="font-body text-[14px] text-text-faint">No hay noticias para este filtro todavía.</p>
        </Card>
      )}

      {/* Móvil: filas densas, titular a la izquierda y miniatura a la derecha. */}
      {!loading && filtered.length > 0 && (
        <ul className="divide-y divide-hairline lg:hidden">
          {filtered.map((article) => (
            <li key={article.id}>
              <Link to={`/noticias/${article.id}`} className="group flex items-start gap-3.5 py-4">
                <div className="min-w-0 flex-1">
                  <NewsMeta article={article} />
                  <h2 className="mt-1.5 font-body text-[16px] font-bold leading-[1.35] text-text-primary group-hover:text-steel">{article.title}</h2>
                </div>
                <NewsThumb imageUrl={article.image_url} sourceName={article.source_name} className="h-[72px] w-[72px] shrink-0 rounded-lg" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Escritorio: nota destacada y rejilla de tarjetas. */}
      {!loading && hero && (
        <div className="hidden lg:block">
          <Link
            to={`/noticias/${hero.id}`}
            className="group grid grid-cols-[1.1fr_1fr] items-center gap-7 border-b border-hairline pb-7"
          >
            <NewsThumb imageUrl={hero.image_url} sourceName={hero.source_name} showSource eager className="aspect-video rounded-xl" />
            <div>
              <p className="label-mono !text-steel">{NEWS_CATEGORY_LABELS[hero.category]}</p>
              <p className="num mt-2 text-[11px] text-text-faint">
                {hero.source_name} · {formatRelativeTime(hero.published_at)}
              </p>
              <h2 className="font-display mt-3 text-[28px] leading-[1.15] text-text-primary group-hover:text-steel">{hero.title}</h2>
              {hero.summary && <p className="mt-3.5 line-clamp-3 font-body text-[15px] leading-relaxed text-text-faint">{hero.summary}</p>}
            </div>
          </Link>

          <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-9 xl:grid-cols-3">
            {rest.map((article) => (
              <Link key={article.id} to={`/noticias/${article.id}`} className="group flex flex-col">
                <NewsThumb imageUrl={article.image_url} sourceName={article.source_name} showSource className="aspect-[16/10] rounded-[10px]" />
                <p className="label-mono mt-3 !text-steel">{NEWS_CATEGORY_LABELS[article.category]}</p>
                <p className="num mt-1.5 text-[11px] text-text-faint">
                  {article.source_name} · {formatRelativeTime(article.published_at)}
                </p>
                <h3 className="mt-2 font-body text-[17px] font-bold leading-[1.3] text-text-primary group-hover:text-steel">{article.title}</h3>
                {article.summary && <p className="mt-2 line-clamp-2 font-body text-[13px] leading-relaxed text-text-faint">{article.summary}</p>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <p className="num mt-8 text-[11px] text-text-faint">Los titulares y resúmenes provienen de fuentes externas.</p>
      )}
    </main>
  )
}
