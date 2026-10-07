import { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Field } from '../components/ui/field'
import { PageHeader } from '../components/ui/page-header'
import { Segmented } from '../components/ui/segmented'
import { TradeListRow } from '../components/trade/TradeListRow'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { tradesToCsv, downloadCsv } from '../lib/tradeExport'
import { useToast } from '../lib/toast'
import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type StatusFilter = 'all' | 'open' | 'closed'
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Abiertos' },
  { value: 'closed', label: 'Cerrados' },
]

export default function Historial() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [trades, setTrades] = useState<TradeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function load() {
      // Historial incluye también las operaciones de práctica; la tasa que se
      // resume arriba sigue excluyendo backtesting para no mezclar resultados.
      const { data, error: fetchError } = await supabase
        .from('trades')
        .select('*, instruments(symbol, market)')
        .order('traded_at', { ascending: false })
      if (cancelled) return
      if (fetchError) {
        setError(getErrorMessage(fetchError))
        setLoading(false)
        return
      }
      setTrades((data as TradeRow[] | null) ?? [])
      setLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase()
    return trades.filter((trade) => {
      if (statusFilter !== 'all' && trade.status !== statusFilter) return false
      return !query || (trade.instruments?.symbol ?? '').toUpperCase().includes(query)
    })
  }, [trades, search, statusFilter])

  const winRate = useMemo(() => {
    const closed = trades.filter((trade) => trade.status === 'closed' && !trade.is_backtest)
    if (closed.length === 0) return null
    const wins = closed.filter((trade) => (trade.pnl_amount ?? 0) > 0).length
    return Math.round((wins / closed.length) * 100)
  }, [trades])

  function handleExport() {
    const csv = tradesToCsv(filtered)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`lineatrade-trades-${today}.csv`, csv)
    showToast(`${filtered.length} trade${filtered.length === 1 ? '' : 's'} exportado${filtered.length === 1 ? '' : 's'}.`, 'success')
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-28 pt-6 lg:pb-12">
      <PageHeader
        kicker="Registro completo"
        title="Historial"
        lead={`${trades.length} ${trades.length === 1 ? 'trade' : 'trades'}${winRate == null ? '' : ` · ${winRate}% win rate`}`}
        actions={!loading && filtered.length > 0 ? (
          <Button type="button" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" aria-hidden="true" />Exportar CSV
          </Button>
        ) : undefined}
      />

      {error && <p role="alert" className="mb-5 rounded-lg border border-loss/30 bg-loss/10 px-4 py-3 font-body text-[14px] text-loss">{error}</p>}

      <section aria-label="Filtros del historial" className="mb-5 grid gap-3 sm:grid-cols-[minmax(220px,1fr)_minmax(260px,340px)] sm:items-end">
        <Field
          id="trade-search"
          label="Buscar instrumento"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Símbolo, por ejemplo NQ"
        />
        <Segmented label="Filtrar por estado" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
      </section>

      {loading && <p className="font-body text-[14px] text-text-faint">Cargando historial…</p>}

      {!loading && filtered.length === 0 && (
        <Card tone="dashed" className="py-8">
          <p className="font-display text-[17px] text-text-primary">
            {trades.length === 0 ? 'Aún no tienes trades registrados.' : 'No encontramos operaciones con esos filtros.'}
          </p>
          <p className="mt-1 font-body text-[13px] text-text-faint">
            {trades.length === 0 ? 'Tu historial empieza cuando registras la primera operación.' : 'Prueba otro símbolo o cambia el estado seleccionado.'}
          </p>
          {trades.length === 0 && <Button asChild variant="cta" className="mt-4"><Link to="/nuevo-trade">Registrar mi primer trade</Link></Button>}
        </Card>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <p className="mb-2 font-mono text-[11px] text-text-faint" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'resultado' : 'resultados'}</p>
          <Card as="section" className="divide-y divide-hairline overflow-hidden p-0" aria-label="Operaciones del historial">
            {filtered.map((trade, index) => <TradeListRow key={trade.id} trade={trade} index={index} showDate />)}
          </Card>
        </>
      )}
    </main>
  )
}
