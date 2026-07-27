import { useCallback, useEffect, useRef, useState } from 'react'
import type { Kline } from '../lib/marketData/types'

const DEFAULT_SPEED_MS = 800

export function useMarketReplay(klines: Kline[]) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Se reinicia solo cuando cambia la referencia de `klines` (una sesión de
  // backtest nueva) — así el caller no tiene que acordarse de llamar reset() a
  // mano después de cada fetch. Antes esa coordinación vivía en Backtesting.tsx
  // y era fácil de romper (el índice viejo podía quedar apuntando más allá del
  // total de velas de la sesión nueva).
  useEffect(() => {
    setCurrentIndex(0)
    setIsPlaying(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [klines])

  useEffect(() => {
    if (!isPlaying) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((i) => {
        if (i >= klines.length - 1) {
          setIsPlaying(false)
          return i
        }
        return i + 1
      })
    }, speedMs)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, speedMs, klines.length])

  const stepForward = useCallback(
    (n = 1) => {
      setCurrentIndex((i) => Math.min(i + n, klines.length - 1))
    },
    [klines.length],
  )

  const stepBackward = useCallback((n = 1) => {
    setCurrentIndex((i) => Math.max(i - n, 0))
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex(0)
  }, [])

  // "Ocultar el futuro" — el gráfico solo recibe este slice, nunca el array
  // completo. No es un estilo visual, es la garantía real de que el usuario no
  // puede ver velas futuras inspeccionando el estado/DOM.
  const visibleKlines = klines.slice(0, currentIndex + 1)
  const currentKline = klines[currentIndex] as Kline | undefined
  const isAtEnd = currentIndex >= klines.length - 1

  return {
    currentIndex,
    visibleKlines,
    currentKline,
    isAtEnd,
    isPlaying,
    setIsPlaying,
    speedMs,
    setSpeedMs,
    stepForward,
    stepBackward,
    reset,
  }
}
