import { useEffect, useRef, useState } from 'react'
import { getErrorMessage } from '../lib/errors'
import { binanceProvider } from '../lib/marketData/binanceProvider'
import { getKlinesForReplay } from '../lib/marketData/klineCache'
import type { Kline, MarketInterval } from '../lib/marketData/types'
import { createBacktestSession, endBacktestSession, type BacktestSession } from '../lib/backtestSessions'

type Phase = 'setup' | 'loading' | 'active'

// Extraído de Backtesting.tsx para que el ciclo de vida de una sesión de replay
// (traer velas, crear/cerrar backtest_sessions) se pueda probar solo, sin montar
// la página completa — mismo motivo que ya justificó useMarketReplay.ts como hook
// aparte. La UI (Backtesting.tsx) solo llama start()/finish() y lee el estado.
export function useBacktestSession(userId: string | undefined) {
  const [phase, setPhase] = useState<Phase>('setup')
  const [error, setError] = useState<string | null>(null)
  const [klines, setKlines] = useState<Kline[]>([])
  const [session, setSession] = useState<BacktestSession | null>(null)
  const [finishing, setFinishing] = useState(false)

  // IDs de sesión ya cerradas (por finish() o por el cleanup de abajo) — sin
  // esto, cerrar la sesión a mano dispara setSession(null), que cambia la dep
  // `session?.id` del efecto, lo cual corre la cleanup del efecto ANTERIOR (que
  // todavía capturó el `session` viejo con ended_at=null en memoria) y termina
  // llamando endBacktestSession() una segunda vez de más.
  const endedSessionIds = useRef(new Set<string>())

  // Cierra la sesión de replay (backtest_sessions.ended_at) si el usuario navega
  // fuera de la página con una sesión todavía activa — no bloquea la salida, es
  // best-effort (no hay forma confiable de esperar una request en beforeunload).
  useEffect(() => {
    return () => {
      if (session && !endedSessionIds.current.has(session.id)) {
        endedSessionIds.current.add(session.id)
        void endBacktestSession(session.id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id])

  async function start({ symbol, interval }: { symbol: string; interval: MarketInterval }) {
    if (!userId) return
    setPhase('loading')
    setError(null)
    try {
      const fetchedKlines = await getKlinesForReplay(binanceProvider, symbol, interval)
      if (fetchedKlines.length === 0) {
        setError(`Binance no devolvió velas para ${symbol}. Confirmá que el símbolo existe (ej. BTCUSDT).`)
        setPhase('setup')
        return
      }
      const newSession = await createBacktestSession({
        userId,
        symbol,
        interval,
        replayFrom: new Date(fetchedKlines[0].time * 1000).toISOString(),
        replayTo: new Date(fetchedKlines[fetchedKlines.length - 1].time * 1000).toISOString(),
      })
      setKlines(fetchedKlines)
      setSession(newSession)
      setPhase('active')
    } catch (err) {
      setError(getErrorMessage(err))
      setPhase('setup')
    }
  }

  async function finish() {
    if (session && !endedSessionIds.current.has(session.id)) {
      endedSessionIds.current.add(session.id)
      setFinishing(true)
      try {
        await endBacktestSession(session.id)
      } catch (err) {
        endedSessionIds.current.delete(session.id)
        setError(getErrorMessage(err))
        setFinishing(false)
        return
      }
      setFinishing(false)
    }
    setSession(null)
    setKlines([])
    setPhase('setup')
  }

  return { phase, error, klines, session, finishing, start, finish }
}
