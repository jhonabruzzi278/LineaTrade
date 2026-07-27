import type { Kline, MarketDataProvider, MarketInterval } from './types'
import { MAX_LOOKBACK_BY_INTERVAL } from './types'
import { BINANCE_KLINES_MAX_LIMIT } from './binanceProvider'

type CacheEntry = { klines: Kline[] }
const cache = new Map<string, CacheEntry>()

function cacheKey(providerId: string, symbol: string, interval: MarketInterval): string {
  return `${providerId}:${symbol}:${interval}`
}

// Vela histórica cerrada nunca cambia de valor, así que no hace falta TTL para
// correctitud (a diferencia de lib/news.ts, que cachea contenido que sí puede
// quedar stale) — esto solo evita re-pedirle a Binance el mismo rango dos veces
// dentro de la misma sesión de la pestaña.
export async function getKlinesForReplay(
  provider: MarketDataProvider,
  symbol: string,
  interval: MarketInterval,
): Promise<Kline[]> {
  const key = cacheKey(provider.id, symbol, interval)
  const cached = cache.get(key)
  if (cached) return cached.klines

  const oldestAllowedMs = Date.now() - MAX_LOOKBACK_BY_INTERVAL[interval]
  const klines: Kline[] = []
  let endTime: number | undefined

  // Pagina hacia atrás con endTime (límite duro de Binance: 1000 velas por
  // request) hasta el límite de lookback de esta temporalidad, o hasta que
  // Binance ya no tenga más histórico para devolver. Termina en pocas iteraciones
  // para cualquiera de los MAX_LOOKBACK_BY_INTERVAL definidos (peor caso, 1h a 6
  // meses, son ~5 páginas).
  for (;;) {
    const page = await provider.getKlines({ symbol, interval, endTime, limit: BINANCE_KLINES_MAX_LIMIT })
    if (page.length === 0) break
    klines.unshift(...page)
    const oldestInPageMs = page[0].time * 1000
    if (oldestInPageMs <= oldestAllowedMs || page.length < BINANCE_KLINES_MAX_LIMIT) break
    endTime = oldestInPageMs - 1
  }

  const trimmed = klines.filter((k) => k.time * 1000 >= oldestAllowedMs)
  cache.set(key, { klines: trimmed })
  return trimmed
}
