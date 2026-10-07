import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, NotebookPen, Plus, Search, SearchX, X } from 'lucide-react'
import { TradeListRow, TradeTableHeader, type TradeListItem } from '../components/trade/TradeListRow'
import { Button, buttonVariants } from '../components/ui/button'
import { Callout } from '../components/ui/callout'
import { Card } from '../components/ui/card'
import { FIELD_CLASS } from '../components/ui/field'
import { Segmented } from '../components/ui/segmented'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { tradesToCsv, downloadCsv } from '../lib/tradeExport'
import { useToast } from '../lib/toast'
import { cn } from '@/lib/utils'

type StatusFilter = 'all' | 'open' | 'closed'

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'closed', label: 'Cerrados' },
]

const STATUS_NOUN: Record<StatusFilter, string> = { all: 'trades', open: 'trades abiertos', closed: 'trades cerrados' }

export default function Historial() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [trades, setTrades] = useState<TradeListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      // A diferencia de Inicio, aquí SÍ se traen las operaciones de práctica: el
      // Historial es el registro completo de lo que hiciste (TradeListRow las marca
      // con «Práctica»). Lo que queda protegido es el win rate del encabezado,
      // calculado aparte solo sobre trades reales.
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('*, instruments(symbol, market), strategies(name)')
        .is('deleted_at', null)
        .order('traded_at', { ascending: false })
      if (cancelled) return
      if (fetchError) {
        setError(getErrorMessage(fetchError))
        setLoading(false)
        return
      }
      setTrades((data as TradeListItem[] | null) ?? [])
      setLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase()
    return trades.filter((trade) => {
      if (statusFilter !== 'all' && trade.status !== statusFilter) return false
      if (query && !(trade.instruments?.symbol ?? '').toUpperCase().includes(query)) return false
      return true
    })
  }, [trades, search, statusFilter])

  const winRate = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'closed' && !t.is_backtest)
    if (closed.length === 0) return null
    const wins = closed.filter((t) => (t.pnl_amount ?? 0) > 0).length
    return Math.round((wins / closed.length) * 100)
  }, [trades])

  const hasFilters = search.trim() !== '' || statusFilter !== 'all'
  const countLabel = hasFilters && !loading
    ? `${filtered.length} de ${trades.length} trades`
    : `${trades.length} trade${trades.length === 1 ? '' : 's'}${winRate != null ? ` · ${winRate}% win rate` : ''}`

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
  }

  function handleExport() {
    const csv = tradesToCsv(filtered)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`lineatrade-trades-${today}.csv`, csv)
    showToast(`${filtered.length} trade${filtered.length === 1 ? '' : 's'} exportado${filtered.length === 1 ? '' : 's'}.`, 'success')
  }

  const canExport = !loading && filtered.length > 0

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-4 lg:mb-5">
        <div className="min-w-0">
          <p className="label-mono">registro completo</p>
          <h1 className="font-display mt-1.5 text-[26px] leading-tight text-text-primary lg:text-[32px]">Historial</h1>
          {!loading && !error && <p className="num mt-2 text-[11px] text-text-faint lg:text-[12px]">{countLabel}</p>}
        </div>
        <div className="flex items-center gap-2.5">
          {canExport && (
            <>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Exportar CSV" onClick={handleExport}>
                <Download className="h-[19px] w-[19px]" aria-hidden="true" />
              </Button>
              <Button variant="outline" size="lg" className="hidden lg:inline-flex" onClick={handleExport}>
                <Download className="h-[17px] w-[17px]" aria-hidden="true" />
                Exportar CSV
              </Button>
            </>
          )}
          <Link to="/nuevo-trade" className={cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'hidden lg:inline-flex')}>
            <Plus className="h-[17px] w-[17px]" strokeWidth={2.6} aria-hidden="true" />
            Registrar trade
          </Link>
        </div>
      </header>

      {error && (
        <Callout tone="warning" className="mb-4">
          <span role="alert">No pudimos cargar tu historial. {error}</span>
        </Callout>
      )}

      {!error && (
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative lg:max-w-[460px] lg:flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-faint" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Buscar por símbolo"
              placeholder="Buscar por símbolo…"
              className={cn(FIELD_CLASS, 'min-h-12 pl-[42px] pr-11 [&::-webkit-search-cancel-button]:hidden')}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Borrar búsqueda"
                className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-text-faint hover:text-text-primary"
              >
                <X className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
              </button>
            )}
          </div>
          <Segmented label="Estado" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} className="lg:w-72" />
        </div>
      )}

      {loading && (
        <div role="status" aria-label="Cargando tu historial" className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[58px] animate-pulse rounded-[10px] bg-panel-2" />
          ))}
          <span className="sr-only">Cargando tu historial…</span>
        </div>
      )}

      {!loading && !error && trades.length === 0 && (
        <Card tone="dashed" className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <NotebookPen className="h-[30px] w-[30px] text-text-faint" strokeWidth={1.6} aria-hidden="true" />
          <h2 className="font-display text-[19px] text-text-primary">Aún no tienes trades registrados</h2>
          <p className="max-w-sm font-body text-[14px] leading-relaxed text-text-faint">
            Sube la captura de tu primera operación y aparecerá aquí con su resultado en R.
          </p>
          <Link to="/nuevo-trade" className={cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'mt-3')}>
            Registrar mi primer trade
          </Link>
        </Card>
      )}

      {!loading && !error && trades.length > 0 && filtered.length === 0 && (
        <div className="mt-6 px-3 text-center lg:mt-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-panel text-text-faint">
            <SearchX className="h-[26px] w-[26px]" strokeWidth={1.8} aria-hidden="true" />
          </div>
          <h2 className="font-display mt-4 text-[19px] text-text-primary">Nada coincide con ese filtro</h2>
          <p className="mx-auto mt-2 max-w-sm font-body text-[14px] leading-relaxed text-text-faint">
            No hay {STATUS_NOUN[statusFilter]}
            {search.trim() ? ` de “${search.trim()}”` : ''}. Prueba con otro símbolo o quita los filtros.
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Quitar filtros
          </Button>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Card as="section" aria-label="Lista de trades" className="overflow-hidden p-0 sm:p-0">
          <TradeTableHeader showStatus />
          <ul className="divide-y divide-hairline">
            {filtered.map((trade, index) => (
              <li key={trade.id}>
                <TradeListRow trade={trade} index={index} showStatus />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </main>
  )
}
