export type Kline = {
  time: number // unix seconds — coincide con el UTCTimestamp que espera lightweight-charts
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type MarketInterval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d'

export interface MarketDataProvider {
  readonly id: string
  listSymbols(): Promise<string[]>
  getKlines(params: {
    symbol: string
    interval: MarketInterval
    endTime?: number // unix ms — para paginar hacia atrás
    limit?: number
  }): Promise<Kline[]>
}

// Retroceso máximo por temporalidad, en ms — evita que la paginación hacia atrás
// (klineCache.ts) pida historia infinita. Ver docs/lineatrade-backtesting-plan.md §2.
const DAY_MS = 24 * 60 * 60 * 1000
export const MAX_LOOKBACK_BY_INTERVAL: Record<MarketInterval, number> = {
  '1m': 7 * DAY_MS,
  '5m': 30 * DAY_MS,
  '15m': 30 * DAY_MS,
  '1h': 182 * DAY_MS,
  '4h': 182 * DAY_MS,
  '1d': 730 * DAY_MS,
}
