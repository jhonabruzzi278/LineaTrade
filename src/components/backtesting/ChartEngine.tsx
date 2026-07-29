import { useEffect, useRef } from 'react'
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'
import type { Kline } from '../../lib/marketData/types'
import { isRangeShape, type ConfluenceShape } from '../../lib/confluences'
import { ConfluenceZonePrimitive, type ZoneShape } from './confluencePrimitive'

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

export type AnnotationView = {
  id: string
  timeStart: number
  priceStart: number
  timeEnd: number | null
  priceEnd: number | null
  color: string
  shape: ConfluenceShape
}

type PendingPoint = { time: number; price: number; color: string }

type Props = {
  klines: Kline[]
  annotations?: AnnotationView[]
  pendingPoint?: PendingPoint | null
  drawingActive?: boolean
  onChartPoint?: (point: { time: number; price: number }) => void
}

function shapeToZoneShape(shape: ConfluenceShape): ZoneShape {
  return shape === 'line' ? 'line' : 'box'
}

function toMarker(annotation: AnnotationView): SeriesMarker<Time> {
  const base = {
    time: annotation.timeStart as UTCTimestamp,
    color: annotation.color,
    id: annotation.id,
  }
  if (annotation.shape === 'circle') {
    return { ...base, position: 'inBar', shape: 'circle' }
  }
  if (annotation.shape === 'label') {
    return { ...base, position: 'aboveBar', shape: 'circle', text: '●' }
  }
  // 'arrow'
  return { ...base, position: 'belowBar', shape: 'arrowUp' }
}

export function ChartEngine({ klines, annotations = [], pendingPoint = null, drawingActive = false, onChartPoint }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const markersApiRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const zonePrimitivesRef = useRef<Map<string, ConfluenceZonePrimitive>>(new Map())
  const onChartPointRef = useRef(onChartPoint)
  onChartPointRef.current = onChartPoint

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const zonePrimitives = zonePrimitivesRef.current
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
    markersApiRef.current = createSeriesMarkers(series, [])

    const clickHandler = (param: MouseEventParams) => {
      if (!onChartPointRef.current || !param.point || param.time === undefined) return
      const price = series.coordinateToPrice(param.point.y)
      if (price === null) return
      onChartPointRef.current({ time: Number(param.time), price })
    }
    chart.subscribeClick(clickHandler)

    const resize = () => chart.resize(container.clientWidth, container.clientHeight, true)
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.unsubscribeClick(clickHandler)
      zonePrimitives.clear()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      markersApiRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    seriesRef.current.setData(klines.map((k) => ({ ...k, time: k.time as UTCTimestamp })))
    chartRef.current?.timeScale().fitContent()
  }, [klines])

  // Objetos puntuales (arrow/circle/label) — un solo createSeriesMarkers reusado
  // entre renders, actualizado vía setMarkers() en vez de recrearse cada vez.
  useEffect(() => {
    if (!markersApiRef.current) return
    const pointMarkers = annotations.filter((a) => !isRangeShape(a.shape)).map(toMarker)
    const pendingMarker: SeriesMarker<Time>[] = pendingPoint
      ? [{ time: pendingPoint.time as UTCTimestamp, position: 'inBar', shape: 'circle', color: pendingPoint.color, id: '__pending__' }]
      : []
    markersApiRef.current.setMarkers([...pointMarkers, ...pendingMarker])
  }, [annotations, pendingPoint])

  // Objetos de rango (square/rectangle/line) — un ConfluenceZonePrimitive por
  // anotación, adjuntado/eliminado según qué ids siguen presentes.
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const rangeAnnotations = annotations.filter((a) => isRangeShape(a.shape) && a.timeEnd !== null && a.priceEnd !== null)
    const nextIds = new Set(rangeAnnotations.map((a) => a.id))

    for (const [id, primitive] of zonePrimitivesRef.current) {
      if (!nextIds.has(id)) {
        series.detachPrimitive(primitive)
        zonePrimitivesRef.current.delete(id)
      }
    }

    for (const annotation of rangeAnnotations) {
      if (zonePrimitivesRef.current.has(annotation.id)) continue
      const primitive = new ConfluenceZonePrimitive(
        { time: annotation.timeStart as UTCTimestamp, price: annotation.priceStart },
        { time: (annotation.timeEnd as number) as UTCTimestamp, price: annotation.priceEnd as number },
        annotation.color,
        shapeToZoneShape(annotation.shape),
      )
      series.attachPrimitive(primitive)
      zonePrimitivesRef.current.set(annotation.id, primitive)
    }
  }, [annotations])

  useEffect(() => {
    if (containerRef.current) containerRef.current.style.cursor = drawingActive ? 'crosshair' : 'default'
  }, [drawingActive])

  return <div ref={containerRef} className="h-full w-full" />
}
