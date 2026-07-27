import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { Kline } from '../../lib/marketData/types'

// Espejo de los tokens gain/loss/hairline/text-faint de src/index.css — mismo tipo
// de excepción ya aceptada en TraceLine.tsx (ver CLAUDE.md "Icons"/"Design system"):
// la API de lightweight-charts pide strings de color directos, no es un contexto de
// clases de Tailwind. Mantener sincronizado si esos tokens cambian.
const CHART_COLORS = {
  gain: '#0ECB81',
  loss: '#F6465D',
  textFaint: '#565D6B',
  hairline: '#232935',
} as const

type Props = {
  klines: Kline[]
}

export function ChartEngine({ klines }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    // `autoSize: true` delega el resize a un ResizeObserver interno de la librería
    // y de ahí en más IGNORA llamadas manuales a chart.resize() (documentado en su
    // propio .d.ts) — se prefiere un ResizeObserver propio, explícito, para tener
    // control real sobre cuándo se repinta en vez de confiar en el timing interno.
    const chart = createChart(container, {
      layout: { background: { color: 'transparent' }, textColor: CHART_COLORS.textFaint },
      grid: {
        vertLines: { color: CHART_COLORS.hairline },
        horzLines: { color: CHART_COLORS.hairline },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
    })
    const series = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.gain,
      downColor: CHART_COLORS.loss,
      borderVisible: false,
      wickUpColor: CHART_COLORS.gain,
      wickDownColor: CHART_COLORS.loss,
    })
    chartRef.current = chart
    seriesRef.current = series

    const resize = () => chart.resize(container.clientWidth, container.clientHeight, true)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(klines.map((k) => ({ ...k, time: k.time as UTCTimestamp })))
    chartRef.current?.timeScale().fitContent()
  }, [klines])

  return <div ref={containerRef} className="h-full w-full" />
}
