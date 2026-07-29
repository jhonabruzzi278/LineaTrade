import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { AppFloatingNav } from '../components/AppFloatingNav'
import { ScannerResultRow } from '../components/scanner/ScannerResultRow'
import { listScannerResults, type ScannerResult } from '../lib/scanner'
import { getErrorMessage } from '../lib/errors'

type RsiZoneFilter = 'all' | 'oversold' | 'overbought'
type SortKey = 'price_change_pct' | 'volume_spike_ratio' | 'rsi_14'

const RSI_ZONE_FILTERS: RsiZoneFilter[] = ['all', 'oversold', 'overbought']
const RSI_ZONE_LABELS: Record<RsiZoneFilter, string> = { all: 'todos', oversold: 'sobreventa', overbought: 'sobrecompra' }
const SORT_LABELS: Record<SortKey, string> = {
  price_change_pct: 'variación %',
  volume_spike_ratio: 'volumen',
  rsi_14: 'RSI',
}

// Cripto solamente (Binance) — mismo alcance ya establecido en /backtesting, ver
// CLAUDE.md "Crypto only — forex/stocks explicitly pending". Resultados globales
// (scanner_results no tiene user_id), refrescados por el cron run-scanner cada 5
// minutos — esta página solo lee, nunca dispara un escaneo ella misma.
export default function Scanner() {
  const [results, setResults] = useState<ScannerResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [rsiZone, setRsiZone] = useState<RsiZoneFilter>('all')
  const [minVolumeSpike, setMinVolumeSpike] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('price_change_pct')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await listScannerResults()
        if (!cancelled) setResults(data)
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toUpperCase()
    const minSpike = minVolumeSpike.trim() ? Number(minVolumeSpike) : null
    return results
      .filter((r) => {
        if (query && !r.symbol.includes(query)) return false
        if (rsiZone === 'oversold' && !(r.rsi_14 != null && r.rsi_14 < 30)) return false
        if (rsiZone === 'overbought' && !(r.rsi_14 != null && r.rsi_14 > 70)) return false
        if (minSpike != null && !(r.volume_spike_ratio != null && r.volume_spike_ratio >= minSpike)) return false
        return true
      })
      .sort((a, b) => {
        const av = a[sortKey] ?? -Infinity
        const bv = b[sortKey] ?? -Infinity
        return bv - av
      })
  }, [results, search, rsiZone, minVolumeSpike, sortKey])

  const lastScannedAt = results[0]?.scanned_at

  return (
    <div className="min-h-screen bg-ink">
      <AppHeader />
      <main className="max-w-5xl mx-auto px-6 py-10 pb-28">
        <div className="mb-2">
          <p className="font-mono text-[13px] text-signal mb-2">market scanner</p>
          <h1 className="font-display text-[28px] text-text-primary">Escáner de cripto</h1>
        </div>
        <p className="font-mono text-[12px] text-text-faint mb-8">
          {results.length} pares · actualizado cada 5 min
          {lastScannedAt && ` · último escaneo ${new Date(lastScannedAt).toLocaleTimeString('es')}`}
        </p>

        {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}

        <div className="flex flex-col gap-3 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar símbolo (ej. BTCUSDT)..."
            className="bg-panel border border-hairline rounded-sm px-4 py-2.5 font-body text-[14px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {RSI_ZONE_FILTERS.map((zone) => (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setRsiZone(zone)}
                  aria-pressed={rsiZone === zone}
                  className={`shrink-0 font-mono text-[12px] px-3 py-2 rounded-sm border transition-colors ${
                    rsiZone === zone ? 'border-signal text-signal bg-signal/10' : 'border-hairline text-text-muted hover:border-text-faint'
                  }`}
                >
                  {RSI_ZONE_LABELS[zone]}
                </button>
              ))}
            </div>

            <input
              type="number"
              step="0.5"
              min="0"
              value={minVolumeSpike}
              onChange={(e) => setMinVolumeSpike(e.target.value)}
              placeholder="Vol. mínimo (ej. 2)"
              className="sm:w-40 bg-panel border border-hairline rounded-sm px-3 py-2 font-mono text-[12px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors"
            />

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="sm:w-44 bg-panel border border-hairline rounded-sm px-3 py-2 font-mono text-[12px] text-text-primary focus:outline-none focus:border-signal transition-colors"
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  ordenar por {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p className="font-body text-[14px] text-text-muted">Cargando...</p>}

        {!loading && filtered.length === 0 && (
          <div className="border border-hairline rounded-sm bg-gradient-to-b from-panel-2 to-panel px-6 py-10 text-center shadow-card">
            <p className="font-body text-[15px] text-text-muted">
              {results.length === 0 ? 'El escáner todavía no corrió — volvé en unos minutos.' : 'Nada coincide con estos filtros.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="border border-hairline rounded-sm divide-y divide-hairline overflow-hidden bg-gradient-to-b from-panel-2 to-panel shadow-card">
            {filtered.map((result) => (
              <ScannerResultRow key={result.symbol} result={result} />
            ))}
          </div>
        )}
      </main>
      <AppFloatingNav />
    </div>
  )
}
