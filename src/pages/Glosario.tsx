import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, Search } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Tag } from '@/components/ui/tag'
import { FIELD_CLASS } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { academyLessons } from '../data/academy'
import {
  filterGlossary,
  GLOSSARY_CATEGORIES,
  GLOSSARY_CATEGORY_LABEL,
  glossaryTerms,
  type GlossaryCategory,
} from '../data/glossary'

type CategoryFilter = GlossaryCategory | 'todo'

const FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  ...GLOSSARY_CATEGORIES.map((value) => ({ value, label: GLOSSARY_CATEGORY_LABEL[value] })),
]

const lessonTitleById = new Map(academyLessons.map((lesson) => [lesson.id, lesson.title]))

export default function Glosario() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('todo')
  const { hash } = useLocation()
  const results = useMemo(() => filterGlossary(glossaryTerms, query, category), [query, category])

  // Llegar desde un término subrayado de una lección (/academia/glosario#drawdown).
  useEffect(() => {
    if (!hash) return
    document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: 'start' })
  }, [hash])

  return (
    <main className="mx-auto max-w-6xl px-5 pt-3 pb-28 lg:pt-6 lg:pb-12">
      <Link to="/academia" className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 font-body text-[14px] font-semibold text-text-faint hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:text-[13px]">
        <ChevronLeft className="h-5 w-5 lg:h-4 lg:w-4" aria-hidden="true" /> Academia
      </Link>

      <div className="max-w-[980px]">
        <header className="mt-2 mb-5">
          <p className="label-mono">academia</p>
          <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary sm:text-[32px]">Glosario</h1>
          <p className="mt-2 hidden max-w-2xl font-body text-[15px] leading-relaxed text-text-faint lg:block">
            Los conceptos de riesgo, fondeo y resultados que vas a encontrar en la app, explicados sin jerga.
          </p>
        </header>

        <div className="relative max-w-[520px]">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-[18px] w-[18px] -translate-y-1/2 text-text-faint" aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar un término"
            placeholder="Buscar un término…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={cn(FIELD_CLASS, 'h-12 bg-panel pl-10')}
          />
        </div>

        <div role="group" aria-label="Tema" className="mt-3 flex flex-wrap gap-2">
          {FILTERS.map((filter) => {
            const selected = filter.value === category
            return (
              <button
                key={filter.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setCategory(filter.value)}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-full border px-4 font-body text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-ink bg-signal text-on-signal' : 'border-input text-text-muted hover:text-text-primary',
                )}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <p role="status" className="num mt-4 text-[11px] text-text-faint">
          {results.length === 1 ? '1 término' : `${results.length} términos`}
        </p>

        {results.length === 0 ? (
          <p className="mt-6 font-body text-[15px] text-text-faint">
            No hay términos que coincidan con «{query.trim()}». Prueba con otra palabra o quita el filtro de tema.
          </p>
        ) : (
          <dl className="mt-1">
            {results.map((term, index) => (
              <div key={term.id} id={term.id} className={cn('scroll-mt-6 border-t border-hairline py-5', index === results.length - 1 && 'border-b')}>
                <dt className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-body text-[17px] font-bold text-text-primary lg:text-[19px]">
                  {term.term}
                  <Tag tone="brand">{GLOSSARY_CATEGORY_LABEL[term.category]}</Tag>
                </dt>
                <dd className="mt-2 max-w-[680px] font-body text-[14px] leading-[1.65] text-text-muted lg:text-[15px]">{term.definition}</dd>
                {term.lessonId && (
                  <dd>
                    <Link
                      to={`/academia/lecciones/${term.lessonId}`}
                      className="mt-2.5 inline-flex min-h-11 items-center font-body text-[13px] font-bold text-steel hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="lg:hidden">Ver lección →</span>
                      <span className="hidden lg:inline">Ver lección: {lessonTitleById.get(term.lessonId)} →</span>
                    </Link>
                  </dd>
                )}
              </div>
            ))}
          </dl>
        )}
      </div>
    </main>
  )
}
