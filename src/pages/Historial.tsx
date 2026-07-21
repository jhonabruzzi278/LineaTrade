import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
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
const STATUS_FILTERS: StatusFilter[] = ['all', 'open', 'closed']

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
    return () => {
      cancelled = true
    }
  }, [user])

  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase()
    return trades.filter((trade) => {
      if (statusFilter !== 'all' && trade.status !== statusFilter) return false
      if (query && !(trade.instruments?.symbol ?? '').includes(query)) return false
      return true
    })
  }, [trades, search, statusFilter])

  const winRate = useMemo(() => {
    const closed = trades.filter((t) => t.status === 'closed')
    if (closed.length === 0) return null
    const wins = closed.filter((t) => (t.pnl_amount ?? 0) > 0).length
    return Math.round((wins / closed.length) * 100)
  }, [trades])

  function handleExport() {
    const csv = tradesToCsv(filtered)
    const today = new Date().toISOString().slice(0, 10)
    downloadCsv(`lineatrade-trades-${today}.csv`, csv)
    showToast(`${filtered.length} trade${filtered.length === 1 ? '' : 's'} exportado${filtered.length === 1 ? '' : 's'}.`, 'success')
  }

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 pb-28">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <p className="font-mono text-[13px] text-signal mb-2">registro completo</p>
            <h1 className="font-display text-[28px] text-text-primary">Historial</h1>
          </div>
          {!loading && filtered.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="font-body text-[13px] px-3 py-2 rounded-sm border border-hairline text-text-muted hover:border-text-faint hover:text-text-primary transition-colors whitespace-nowrap mt-1"
            >
              Exportar CSV
            </button>
          )}
        </div>
        <p className="font-mono text-[12px] text-text-faint mb-8">
          {trades.length} trade{trades.length === 1 ? '' : 's'}
          {winRate != null && ` · ${winRate}% win rate`}
        </p>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por símbolo..."
            className="flex-1 bg-panel border border-hairline rounded-sm px-4 py-2.5 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
          />
          <div className="relative flex w-full sm:w-56 rounded-sm border border-hairline bg-panel">
            <div
              className="absolute top-[3px] bottom-[3px] rounded-sm bg-signal/15 border border-signal/40 transition-all duration-300 ease-out"
              style={{
                left: `calc(${STATUS_FILTERS.indexOf(statusFilter)} * 33.3333% + 3px)`,
                width: 'calc(33.3333% - 6px)',
              }}
              aria-hidden="true"
            />
            {STATUS_FILTERS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`relative z-10 flex-1 font-mono text-[12px] px-3 py-2.5 text-center transition-colors ${
                  statusFilter === status ? 'text-signal' : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {status === 'all' ? 'todos' : status}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted mb-4">
              {trades.length === 0 ? 'Aún no tienes trades registrados.' : 'Nada coincide con ese filtro.'}
            </p>
            {trades.length === 0 && (
              <Link
                to="/nuevo-trade"
                className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow hover:-translate-y-0.5"
              >
                Registrar mi primer trade
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
            {filtered.map((trade, index) => (
              <TradeListRow key={trade.id} trade={trade} index={index} showDate />
            ))}
          </div>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
