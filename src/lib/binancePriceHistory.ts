// "Convierte la IA en tu trader" — histórico de precios para el paquete
// descargable, SOLO para instrumentos cripto: Binance expone klines públicas
// sin API key, con CORS abierto para datos de mercado. No hay equivalente
// gratuito ya identificado para forex/acciones/futuros — ver traderPackage.ts,
// que omite el CSV para esas categorías en vez de bloquear todo el paquete.
const BINANCE_KLINES_URL = 'https://api.binance.com/api/v3/klines'
const MAX_CANDLES_PER_REQUEST = 1000
const MAX_REQUESTS = 20 // techo defensivo — de sobra para años de histórico diario
const HISTORY_START = Date.UTC(2017, 0, 1)
const ONE_DAY_MS = 24 * 60 * 60 * 1000

// Pares con datos diarios largos y estables en Binance — mismo allowlist que
// traderPlanEngine.ts respeta al recomendar un instrumento cripto.
export const SUPPORTED_CRYPTO_PAIRS = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT'] as const

export interface Candle {
  openTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

function toBinanceSymbol(pair: string): string {
  return pair.replace('/', '').toUpperCase()
}

async function fetchKlinesChunk(symbol: string, startTime: number, endTime: number): Promise<Candle[]> {
  const url = new URL(BINANCE_KLINES_URL)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', '1d')
  url.searchParams.set('startTime', String(startTime))
  url.searchParams.set('endTime', String(endTime))
  url.searchParams.set('limit', String(MAX_CANDLES_PER_REQUEST))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Binance respondió ${res.status} al pedir el histórico de ${symbol}.`)
  }
  const raw = (await res.json()) as unknown[][]
  return raw.map((candle) => ({
    openTime: candle[0] as number,
    open: Number(candle[1]),
    high: Number(candle[2]),
    low: Number(candle[3]),
    close: Number(candle[4]),
    volume: Number(candle[5]),
  }))
}

/** Histórico diario completo (paginado, Binance limita 1000 velas por llamada), ascendente por fecha. */
export async function fetchDailyPriceHistory(pair: string): Promise<Candle[]> {
  if (!SUPPORTED_CRYPTO_PAIRS.includes(pair as (typeof SUPPORTED_CRYPTO_PAIRS)[number])) {
    throw new Error(`${pair} no está en el allowlist de pares con histórico soportado.`)
  }

  const symbol = toBinanceSymbol(pair)
  const now = Date.now()
  const candles: Candle[] = []
  let cursor = HISTORY_START

  for (let i = 0; i < MAX_REQUESTS && cursor < now; i++) {
    const chunk = await fetchKlinesChunk(symbol, cursor, now)
    if (chunk.length === 0) break
    candles.push(...chunk)
    cursor = chunk[chunk.length - 1].openTime + ONE_DAY_MS
    if (chunk.length < MAX_CANDLES_PER_REQUEST) break
  }

  return candles
}

/** Formato `Date,Open,High,Low,Close,Volume`, cronológico ascendente. */
export function priceHistoryToCsv(candles: Candle[]): string {
  const header = 'Date,Open,High,Low,Close,Volume'
  const rows = candles.map((c) => {
    const date = new Date(c.openTime).toISOString().slice(0, 10)
    return [date, c.open, c.high, c.low, c.close, c.volume].join(',')
  })
  return [header, ...rows].join('\n')
}
