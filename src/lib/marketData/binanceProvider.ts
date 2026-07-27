import type { Kline, MarketDataProvider } from './types'

export const BINANCE_KLINES_MAX_LIMIT = 1000
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3'

function toKline(row: unknown[]): Kline {
  return {
    time: Math.floor(Number(row[0]) / 1000),
    open: Number(row[1]),
    high: Number(row[2]),
    low: Number(row[3]),
    close: Number(row[4]),
    volume: Number(row[5]),
  }
}

// Público, sin API key, con CORS habilitado para navegador — ver
// docs/lineatrade-backtesting-plan.md §2. `MarketDataProvider` es la interfaz que
// agrega/reemplaza proveedores (forex/acciones a futuro) sin tocar el motor de
// gráfico ni el replay.
export const binanceProvider: MarketDataProvider = {
  id: 'binance',

  async listSymbols() {
    const res = await fetch(`${BINANCE_BASE_URL}/exchangeInfo`)
    if (!res.ok) throw new Error(`Binance exchangeInfo error: ${res.status}`)
    const data = (await res.json()) as { symbols: { symbol: string; quoteAsset: string; status: string }[] }
    return data.symbols.filter((s) => s.quoteAsset === 'USDT' && s.status === 'TRADING').map((s) => s.symbol)
  },

  async getKlines({ symbol, interval, endTime, limit = BINANCE_KLINES_MAX_LIMIT }) {
    const url = new URL(`${BINANCE_BASE_URL}/klines`)
    url.searchParams.set('symbol', symbol)
    url.searchParams.set('interval', interval)
    url.searchParams.set('limit', String(Math.min(limit, BINANCE_KLINES_MAX_LIMIT)))
    if (endTime) url.searchParams.set('endTime', String(endTime))

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Binance klines error: ${res.status}`)
    const raw = (await res.json()) as unknown[][]
    return raw.map(toKline)
  },
}
