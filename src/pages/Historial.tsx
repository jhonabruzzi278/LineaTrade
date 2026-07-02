import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getErrorMessage } from '../lib/errors'
import { formatTradeResult, tradeResultColorClass } from '../lib/tradeDisplay'
import type { Database } from '../types/database'

type TradeRow = Database['public']['Tables']['trades']['Row'] & {
  instruments: Pick<Database['public']['Tables']['instruments']['Row'], 'symbol' | 'market'> | null
}
type StatusFilter = 'all' | 'open' | 'closed'

export default function Historial() {
  const { user } = useAuth()
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

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="font-mono text-[13px] text-signal mb-2">registro completo</p>
        <h1 className="font-display text-[28px] text-text-primary mb-2">Historial</h1>
        <p className="font-mono text-[12px] text-text-faint mb-8">
          {trades.length} trade{trades.length === 1 ? '' : 's'}
          {winRate != null && ` · ${winRate}% win rate`}
        </p>

        {error && <p className="font-body text-[13px] text-red-400 mb-6">{error}</p>}

        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por símbolo..."
            className="flex-1 bg-panel border border-hairline rounded-sm px-4 py-2.5 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
          />
          <div className="flex gap-2">
            {(['all', 'open', 'closed'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`font-mono text-[12px] px-3 py-2.5 rounded-sm border transition-colors ${
                  statusFilter === status
                    ? 'border-signal text-signal'
                    : 'border-hairline text-text-muted hover:border-text-faint'
                }`}
              >
                {status === 'all' ? 'todos' : status}
              </button>
            ))}
          </div>
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-panel px-6 py-10 text-center">
            <p className="font-body text-[15px] text-text-muted mb-4">
              {trades.length === 0 ? 'Aún no tienes trades registrados.' : 'Nada coincide con ese filtro.'}
            </p>
            {trades.length === 0 && (
              <Link
                to="/nuevo-trade"
                className="inline-block font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium hover:bg-signal-dim transition-colors"
              >
                Registrar mi primer trade
              </Link>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden">
            {filtered.map((trade) => (
              <Link
                key={trade.id}
                to={`/trades/${trade.id}`}
                className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-panel-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[12px] text-text-faint w-24 shrink-0">
                    {new Date(trade.traded_at).toLocaleDateString('es', { dateStyle: 'medium' })}
                  </span>
                  <span className="font-mono text-[13px] text-text-primary">
                    {trade.instruments?.symbol ?? '—'}
                  </span>
                  <span
                    className={`font-mono text-[11px] px-2 py-0.5 rounded-sm border ${
                      trade.side === 'long' ? 'border-signal/40 text-signal' : 'border-steel/40 text-steel'
                    }`}
                  >
                    {trade.side}
                  </span>
                  <span className="font-mono text-[11px] text-text-faint">{trade.status}</span>
                </div>
                <span className={`font-mono text-[13px] ${tradeResultColorClass(trade)}`}>
                  {formatTradeResult(trade)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
