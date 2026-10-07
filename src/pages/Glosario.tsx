import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { academyGlossary } from '../data/academy'
import { PageHeader } from '../components/ui/page-header'
import { FIELD_CLASS } from '../components/ui/field'

export default function Glosario() {
  const [query, setQuery] = useState('')
  const entries = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('es')
    return academyGlossary.filter((entry) =>
      `${entry.term} ${entry.category} ${entry.definition}`.toLocaleLowerCase('es').includes(normalized),
    )
  }, [query])

  return (
    <div className="min-h-screen bg-ink">
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8 sm:px-6 lg:pb-12 lg:pt-10">
        <PageHeader kicker="Tu aula · referencia" title="Glosario" lead="Términos para leer tus notas y analizar el mercado. Las definiciones técnicas pueden variar entre métodos: documenta la que usas." />

        <label htmlFor="glossary-search" className="sr-only">Buscar un término</label>
        <div className="relative mb-7">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
          <input id="glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar término, categoría o definición…" className={`${FIELD_CLASS} pl-10`} />
        </div>

        <p className="mb-3 font-mono text-[10px] text-text-faint" aria-live="polite">{entries.length} {entries.length === 1 ? 'término' : 'términos'}</p>
        {entries.length ? (
          <dl className="divide-y divide-hairline border-y border-hairline">
            {entries.map((entry) => (
              <div key={entry.term} className="grid gap-2 py-5 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-5">
                <div>
                  <dt className="font-display text-[16px] font-medium text-text-primary">{entry.term}</dt>
                  <dd className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-signal">{entry.category}</dd>
                </div>
                <dd className="font-body text-[13px] leading-6 text-text-muted">{entry.definition}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="border border-dashed border-hairline px-5 py-10 text-center">
            <p className="font-display text-[17px] text-text-primary">No encontramos ese término</p>
            <p className="mt-2 font-body text-[13px] text-text-faint">Prueba con otra palabra o categoría.</p>
          </div>
        )}

        <Link to="/academia" className="mt-7 inline-flex min-h-11 items-center font-body text-[13px] font-semibold text-signal hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">Volver a Academia</Link>
      </main>
    </div>
  )
}
