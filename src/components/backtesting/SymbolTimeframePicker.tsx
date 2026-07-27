import { useState, type FormEvent } from 'react'
import type { MarketInterval } from '../../lib/marketData/types'
import { MAX_LOOKBACK_BY_INTERVAL } from '../../lib/marketData/types'

const QUICK_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

const INTERVAL_OPTIONS: { value: MarketInterval; label: string }[] = [
  { value: '1m', label: '1 minuto' },
  { value: '5m', label: '5 minutos' },
  { value: '15m', label: '15 minutos' },
  { value: '1h', label: '1 hora' },
  { value: '4h', label: '4 horas' },
  { value: '1d', label: '1 día' },
]

function formatLookback(intervalMs: number): string {
  const days = Math.round(intervalMs / (24 * 60 * 60 * 1000))
  if (days >= 60) return `~${Math.round(days / 30)} meses de historial`
  if (days >= 25) return '~1 mes de historial'
  return `~${days} días de historial`
}

type Props = {
  loading: boolean
  error: string | null
  onStart: (params: { symbol: string; interval: MarketInterval }) => void
}

// Default 15m/BTCUSDT: temporalidad accesible (~1 mes de historial, ~3 requests
// paginados a Binance en vez de cientos) — ver docs/lineatrade-backtesting-plan.md §2.
export function SymbolTimeframePicker({ loading, error, onStart }: Props) {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState<MarketInterval>('15m')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = symbol.trim().toUpperCase()
    if (!trimmed) return
    onStart({ symbol: trimmed, interval })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto px-6 py-10">
      <p className="font-mono text-[11px] text-signal mb-2">market replay</p>
      <h1 className="font-display text-[26px] text-text-primary mb-2">Repasa un símbolo</h1>
      <p className="font-body text-[14px] text-text-muted mb-8">
        Elegí un par de cripto y una temporalidad. Vas a repasar vela por vela sin ver el futuro, y las
        operaciones que abras acá quedan guardadas en tu historial real, marcadas como práctica.
      </p>

      <label htmlFor="bt-symbol" className="font-body text-[13px] text-text-muted block mb-2">
        Símbolo (par contra USDT)
      </label>
      <input
        id="bt-symbol"
        type="text"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value)}
        placeholder="BTCUSDT"
        className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-mono text-[15px] text-text-primary placeholder:text-text-faint focus:outline-none focus:border-signal transition-colors mb-3"
      />
      <div className="flex flex-wrap gap-2 mb-8">
        {QUICK_SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSymbol(s)}
            className={`font-mono text-[12px] px-3 py-1.5 rounded-sm border transition-colors ${
              symbol === s
                ? 'border-signal text-signal bg-signal/10'
                : 'border-hairline text-text-faint hover:text-text-muted hover:border-text-faint'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <label htmlFor="bt-interval" className="font-body text-[13px] text-text-muted block mb-2">
        Temporalidad
      </label>
      <select
        id="bt-interval"
        value={interval}
        onChange={(e) => setInterval(e.target.value as MarketInterval)}
        className="w-full bg-ink border border-hairline rounded-sm px-4 py-3 font-body text-[15px] text-text-primary focus:outline-none focus:border-signal transition-colors mb-2"
      >
        {INTERVAL_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="font-mono text-[11px] text-text-faint mb-8">
        {formatLookback(MAX_LOOKBACK_BY_INTERVAL[interval])}
      </p>

      {error && <p className="font-body text-[13px] text-loss mb-6">{error}</p>}

      <button
        type="submit"
        disabled={loading || !symbol.trim()}
        className="w-full font-body text-[14px] px-5 py-3 rounded-sm bg-signal text-ink font-medium transition-all duration-200 hover:bg-signal-dim hover:shadow-glow disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-signal disabled:hover:shadow-none"
      >
        {loading ? 'Cargando velas...' : 'Comenzar replay'}
      </button>
    </form>
  )
}
