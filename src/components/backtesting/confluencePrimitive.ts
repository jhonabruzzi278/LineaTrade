import type {
  Coordinate,
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts'
import type { CanvasRenderingTarget2D } from 'fancy-canvas'

export type ZonePoint = { time: Time; price: number }
export type ZoneShape = 'box' | 'line'

type ViewCoordinate = { x: Coordinate | null; y: Coordinate | null }

// Dibuja las confluencias de "rango" (FVG/Liquidez/Order Block/Zonas como cuadros,
// BOS como línea) sobre el gráfico — API real de ISeriesPrimitive de
// lightweight-charts v5, verificada contra tradingview/lightweight-charts
// plugin-examples/src/plugins/rectangle-drawing-tool (la librería en sí no expone
// un primitive de rectángulo listo, hay que implementarlo). Coordenadas via
// timeToCoordinate/priceToCoordinate (CSS px) escaladas por el pixel ratio del bitmap
// de destino, siguiendo el mismo patrón de useBitmapCoordinateSpace del ejemplo
// oficial, sin depender de sus helpers internos (PluginBase/positionsBox), que no
// forman parte del paquete publicado.
// Nota: sin parameter properties en los constructores — este repo tiene
// `erasableSyntaxOnly` habilitado en tsconfig, que las prohíbe (generan asignación de
// campo real, no son solo un tipo que se borra al compilar).
class ZonePaneRenderer implements IPrimitivePaneRenderer {
  private _p1: ViewCoordinate
  private _p2: ViewCoordinate
  private _color: string
  private _shape: ZoneShape

  constructor(p1: ViewCoordinate, p2: ViewCoordinate, color: string, shape: ZoneShape) {
    this._p1 = p1
    this._p2 = p2
    this._color = color
    this._shape = shape
  }

  draw(target: CanvasRenderingTarget2D) {
    target.useBitmapCoordinateSpace((scope) => {
      const { x: x1, y: y1 } = this._p1
      const { x: x2, y: y2 } = this._p2
      if (x1 === null || y1 === null || x2 === null || y2 === null) return
      const ctx = scope.context
      const sx1 = x1 * scope.horizontalPixelRatio
      const sx2 = x2 * scope.horizontalPixelRatio
      const sy1 = y1 * scope.verticalPixelRatio
      const sy2 = y2 * scope.verticalPixelRatio

      if (this._shape === 'line') {
        ctx.strokeStyle = this._color
        ctx.lineWidth = Math.max(2 * scope.verticalPixelRatio, 1)
        ctx.beginPath()
        ctx.moveTo(sx1, sy1)
        ctx.lineTo(sx2, sy2)
        ctx.stroke()
        return
      }

      const left = Math.min(sx1, sx2)
      const top = Math.min(sy1, sy2)
      const width = Math.abs(sx2 - sx1)
      const height = Math.abs(sy2 - sy1)
      ctx.fillStyle = this._color
      ctx.globalAlpha = 0.25
      ctx.fillRect(left, top, width, height)
      ctx.globalAlpha = 1
      ctx.strokeStyle = this._color
      ctx.lineWidth = Math.max(scope.verticalPixelRatio, 1)
      ctx.strokeRect(left, top, width, height)
    })
  }
}

class ZonePaneView implements IPrimitivePaneView {
  private _source: ConfluenceZonePrimitive
  private _p1: ViewCoordinate = { x: null, y: null }
  private _p2: ViewCoordinate = { x: null, y: null }

  constructor(source: ConfluenceZonePrimitive) {
    this._source = source
  }

  update() {
    const { chart, series, p1, p2 } = this._source
    if (!chart || !series) return
    const timeScale = chart.timeScale()
    this._p1 = { x: timeScale.timeToCoordinate(p1.time), y: series.priceToCoordinate(p1.price) }
    this._p2 = { x: timeScale.timeToCoordinate(p2.time), y: series.priceToCoordinate(p2.price) }
  }

  renderer() {
    return new ZonePaneRenderer(this._p1, this._p2, this._source.color, this._source.shape)
  }
}

export class ConfluenceZonePrimitive implements ISeriesPrimitive {
  chart: IChartApi | null = null
  series: ISeriesApi<SeriesType> | null = null
  p1: ZonePoint
  p2: ZonePoint
  color: string
  shape: ZoneShape
  private _paneView: ZonePaneView

  constructor(p1: ZonePoint, p2: ZonePoint, color: string, shape: ZoneShape) {
    this.p1 = p1
    this.p2 = p2
    this.color = color
    this.shape = shape
    this._paneView = new ZonePaneView(this)
  }

  attached({ chart, series }: SeriesAttachedParameter): void {
    this.chart = chart as IChartApi
    this.series = series
  }

  detached(): void {
    this.chart = null
    this.series = null
  }

  updateAllViews() {
    this._paneView.update()
  }

  paneViews() {
    return [this._paneView]
  }
}
