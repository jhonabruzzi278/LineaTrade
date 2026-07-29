// run-scanner — cron-invocada cada 5 minutos (ver 20260728190000_scanner_cron_job.sql),
// escanea los pares USDT más líquidos de Binance, calcula indicadores técnicos y
// reemplaza scanner_results completo. Mismo esqueleto de auth que
// send-trade-reminders: solo el cron interno via X-Cron-Secret, nunca una sesión de
// usuario — no hay caso de uso donde el cliente la llame directo.
//
// Primer uso real en este proyecto de pacing/concurrencia contra el límite de peso de
// una API externa: binanceProvider.ts (src/lib/marketData/) nunca necesitó esto
// porque hasta ahora solo pedía un símbolo a la vez, desde el navegador, por acción
// directa del usuario. Acá son ~150 símbolos por corrida, así que se agrega un límite
// de concurrencia explícito — no existía nada de esto antes, es trabajo nuevo, no una
// reutilización.
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClients.ts'
import {
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculatePriceChangePct,
  calculateVolumeSpikeRatio,
} from '../_shared/indicators.ts'

const BINANCE_BASE_URL = 'https://api.binance.com/api/v3'
// Tope defensivo — a este tamaño el peso total (~150 klines de peso 1 c/u, más un par
// de llamadas de peso bajo para exchangeInfo/ticker) queda muy por debajo del límite
// real de Binance (1200/min), pero limita el tiempo total de la corrida y evita
// escanear pares con liquidez tan baja que un indicador ahí no significa nada.
const MAX_SYMBOLS = 150
// Suficientes velas de margen para que MACD(12,26,9) — el que más historia necesita —
// converja bien más allá de su semilla inicial, sin pedir de más.
const KLINES_LIMIT = 60
const KLINES_INTERVAL = '15m'
const CONCURRENCY = 10

function errorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface ExchangeInfoSymbol {
  symbol: string
  quoteAsset: string
  status: string
}

interface Ticker24hr {
  symbol: string
  quoteVolume: string
}

async function fetchTradingUsdtSymbols(): Promise<Set<string>> {
  const res = await fetch(`${BINANCE_BASE_URL}/exchangeInfo`)
  if (!res.ok) throw new Error(`Binance exchangeInfo respondió ${res.status}`)
  const data = (await res.json()) as { symbols: ExchangeInfoSymbol[] }
  return new Set(data.symbols.filter((s) => s.quoteAsset === 'USDT' && s.status === 'TRADING').map((s) => s.symbol))
}

async function fetchTopSymbolsByVolume(validSymbols: Set<string>, limit: number): Promise<string[]> {
  const res = await fetch(`${BINANCE_BASE_URL}/ticker/24hr`)
  if (!res.ok) throw new Error(`Binance ticker/24hr respondió ${res.status}`)
  const data = (await res.json()) as Ticker24hr[]
  return data
    .filter((t) => validSymbols.has(t.symbol))
    .sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume))
    .slice(0, limit)
    .map((t) => t.symbol)
}

async function fetchKlines(symbol: string): Promise<{ close: number; volume: number; time: number }[]> {
  const url = new URL(`${BINANCE_BASE_URL}/klines`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', KLINES_INTERVAL)
  url.searchParams.set('limit', String(KLINES_LIMIT))
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Binance klines respondió ${res.status} para ${symbol}`)
  const raw = (await res.json()) as unknown[][]
  return raw.map((row) => ({
    time: Math.floor(Number(row[0]) / 1000),
    close: Number(row[4]),
    volume: Number(row[5]),
  }))
}

// Límite de concurrencia manual — sin librería (mismo criterio ya establecido en este
// repo de no sumar una dependencia para una sola necesidad puntual, ver CLAUDE.md
// "swipe" de Noticias). N workers toman de la misma cola en vez de lanzar todo junto.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R | null>): Promise<R[]> {
  const results: R[] = []
  let index = 0
  async function worker() {
    while (index < items.length) {
      const current = index++
      const result = await fn(items[current])
      if (result !== null) results.push(result)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

interface ScanRow {
  symbol: string
  price_change_pct: number | null
  volume_spike_ratio: number | null
  rsi_14: number | null
  macd_line: number | null
  macd_signal: number | null
  macd_histogram: number | null
  bollinger_upper: number | null
  bollinger_lower: number | null
  bollinger_percent_b: number | null
  last_price: number
  last_candle_time: number
  scanned_at: string
}

async function scanSymbol(symbol: string): Promise<ScanRow | null> {
  try {
    const klines = await fetchKlines(symbol)
    if (klines.length < 2) return null
    const closes = klines.map((k) => k.close)
    const volumes = klines.map((k) => k.volume)
    const macd = calculateMACD(closes)
    const bollinger = calculateBollingerBands(closes)
    const last = klines[klines.length - 1]

    return {
      symbol,
      price_change_pct: calculatePriceChangePct(closes),
      volume_spike_ratio: calculateVolumeSpikeRatio(volumes),
      rsi_14: calculateRSI(closes),
      macd_line: macd?.line ?? null,
      macd_signal: macd?.signal ?? null,
      macd_histogram: macd?.histogram ?? null,
      bollinger_upper: bollinger?.upper ?? null,
      bollinger_lower: bollinger?.lower ?? null,
      bollinger_percent_b: bollinger?.percentB ?? null,
      last_price: last.close,
      last_candle_time: last.time,
      scanned_at: new Date().toISOString(),
    }
    // Un símbolo que falla (429, símbolo deslistado a mitad de corrida, etc.) no
    // debe tirar abajo toda la corrida — se omite y el resto sigue.
  } catch {
    return null
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('SCANNER_CRON_SECRET')
  const providedCronSecret = req.headers.get('X-Cron-Secret')
  const isCronInternal = !!(cronSecret && providedCronSecret && providedCronSecret === cronSecret)
  if (!isCronInternal) {
    return errorResponse(401, 'Esta función solo la invoca el cron interno.')
  }

  let symbols: string[]
  try {
    const validSymbols = await fetchTradingUsdtSymbols()
    symbols = await fetchTopSymbolsByVolume(validSymbols, MAX_SYMBOLS)
  } catch (err) {
    return errorResponse(502, `No se pudo obtener la lista de símbolos de Binance: ${(err as Error).message}`)
  }

  const rows = await mapWithConcurrency(symbols, CONCURRENCY, scanSymbol)

  if (rows.length === 0) {
    return errorResponse(502, 'Ningún símbolo pudo escanearse en esta corrida.')
  }

  const serviceClient = createServiceClient()
  const { error: upsertError } = await serviceClient.from('scanner_results').upsert(rows, { onConflict: 'symbol' })
  if (upsertError) {
    return errorResponse(500, `No se pudo guardar scanner_results: ${upsertError.message}`)
  }

  return new Response(JSON.stringify({ scanned: symbols.length, saved: rows.length }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
