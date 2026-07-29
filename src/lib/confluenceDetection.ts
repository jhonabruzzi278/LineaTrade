import type { Kline } from './marketData/types'
import type { ConfluenceShape } from './confluences'

// Candidatos determinísticos — matemática pura sobre las velas, sin IA. La IA (Fase 3,
// ver supabase/functions/detect-confluences) solo filtra/explica estos candidatos,
// nunca genera coordenadas propias — mismo principio "el backend calcula, la IA
// interpreta" que ya usa contextBuilder.ts/responseValidator.ts para analyze-trade.
//
// Alcance deliberadamente acotado a 4 patrones objetivamente calculables (FVG, Order
// Block, BOS/CHoCH, Liquidez) — Zona de Oferta/Demanda, Mitigación y Confirmación
// quedan fuera: son estados relativos a estas confluencias (ej. "mitigación" = el
// precio volvió a testear una zona ya dibujada) o demasiado subjetivos para un
// heurístico simple, no patrones nuevos que detectar desde cero.
export type DetectionCandidate = {
  key: string
  confluenceName: 'Fair Value Gap (FVG)' | 'Order Block' | 'BOS' | 'CHoCH' | 'Liquidez'
  shape: ConfluenceShape
  timeStart: number
  priceStart: number
  timeEnd: number | null
  priceEnd: number | null
  rationale: string
}

type SwingPoint = { index: number; time: number; price: number; type: 'high' | 'low' }

// Fractal de 5 velas (2 antes + la vela + 2 después) — el detector de estructura más
// simple y estándar; no pretende igualar un algoritmo ICT completo.
const SWING_LOOKAROUND = 2
const MAX_ORDER_BLOCK_LOOKBACK = 10
const LIQUIDITY_TOLERANCE_PCT = 0.001
const MAX_CANDIDATES = 40

function detectSwingPoints(klines: Kline[]): SwingPoint[] {
  const swings: SwingPoint[] = []
  for (let i = SWING_LOOKAROUND; i < klines.length - SWING_LOOKAROUND; i++) {
    const window = klines.slice(i - SWING_LOOKAROUND, i + SWING_LOOKAROUND + 1)
    const candle = klines[i]
    if (window.every((k) => k.high <= candle.high)) {
      swings.push({ index: i, time: candle.time, price: candle.high, type: 'high' })
    } else if (window.every((k) => k.low >= candle.low)) {
      swings.push({ index: i, time: candle.time, price: candle.low, type: 'low' })
    }
  }
  return swings
}

// FVG: patrón de 3 velas donde la vela intermedia no cubre el hueco entre el máximo/
// mínimo de la primera y el mínimo/máximo de la tercera — el hueco es la zona de
// "imbalance" que el precio tiende a volver a testear.
function detectFairValueGaps(klines: Kline[]): DetectionCandidate[] {
  const candidates: DetectionCandidate[] = []
  for (let i = 0; i < klines.length - 2; i++) {
    const left = klines[i]
    const right = klines[i + 2]
    if (left.high < right.low) {
      candidates.push({
        key: `fvg-bull-${i}`,
        confluenceName: 'Fair Value Gap (FVG)',
        shape: 'square',
        timeStart: left.time,
        priceStart: left.high,
        timeEnd: right.time,
        priceEnd: right.low,
        rationale: `Máximo de la vela ${i} (${left.high}) por debajo del mínimo de la vela ${i + 2} (${right.low}) — imbalance alcista.`,
      })
    } else if (left.low > right.high) {
      candidates.push({
        key: `fvg-bear-${i}`,
        confluenceName: 'Fair Value Gap (FVG)',
        shape: 'square',
        timeStart: left.time,
        priceStart: right.high,
        timeEnd: right.time,
        priceEnd: left.low,
        rationale: `Mínimo de la vela ${i} (${left.low}) por encima del máximo de la vela ${i + 2} (${right.high}) — imbalance bajista.`,
      })
    }
  }
  return candidates
}

// BOS (continuación) / CHoCH (posible reversión) — el cierre rompe el swing high/low
// "pendiente" más reciente. Es BOS si la ruptura va en la misma dirección de la
// tendencia vigente, CHoCH si va en contra (o si todavía no había tendencia definida).
function detectStructureBreaks(klines: Kline[]): DetectionCandidate[] {
  const swings = detectSwingPoints(klines)
  const candidates: DetectionCandidate[] = []
  let trend: 'up' | 'down' | null = null
  let pendingHigh: SwingPoint | null = null
  let pendingLow: SwingPoint | null = null
  let swingCursor = 0

  for (let i = 0; i < klines.length; i++) {
    while (swingCursor < swings.length && swings[swingCursor].index <= i) {
      const swing = swings[swingCursor]
      if (swing.type === 'high' && (!pendingHigh || swing.price > pendingHigh.price)) pendingHigh = swing
      if (swing.type === 'low' && (!pendingLow || swing.price < pendingLow.price)) pendingLow = swing
      swingCursor++
    }

    const candle = klines[i]
    if (pendingHigh && i > pendingHigh.index && candle.close > pendingHigh.price) {
      const isReversal = trend !== 'up'
      candidates.push({
        key: `${isReversal ? 'choch' : 'bos'}-up-${i}`,
        confluenceName: isReversal ? 'CHoCH' : 'BOS',
        shape: isReversal ? 'arrow' : 'line',
        timeStart: pendingHigh.time,
        priceStart: pendingHigh.price,
        timeEnd: candle.time,
        priceEnd: candle.close,
        rationale: `El cierre de la vela ${i} (${candle.close}) rompió el máximo previo ${pendingHigh.price} (vela ${pendingHigh.index}) — ${isReversal ? 'posible cambio de tendencia' : 'continuación alcista'}.`,
      })
      trend = 'up'
      pendingHigh = null
    }

    if (pendingLow && i > pendingLow.index && candle.close < pendingLow.price) {
      const isReversal = trend !== 'down'
      candidates.push({
        key: `${isReversal ? 'choch' : 'bos'}-down-${i}`,
        confluenceName: isReversal ? 'CHoCH' : 'BOS',
        shape: isReversal ? 'arrow' : 'line',
        timeStart: pendingLow.time,
        priceStart: pendingLow.price,
        timeEnd: candle.time,
        priceEnd: candle.close,
        rationale: `El cierre de la vela ${i} (${candle.close}) rompió el mínimo previo ${pendingLow.price} (vela ${pendingLow.index}) — ${isReversal ? 'posible cambio de tendencia' : 'continuación bajista'}.`,
      })
      trend = 'down'
      pendingLow = null
    }
  }
  return candidates
}

// Order Block: última vela "opuesta" (roja antes de un impulso alcista, verde antes de
// uno bajista) previa a una ruptura de estructura ya detectada — heurística
// simplificada del concepto, no un algoritmo ICT completo con validación de volumen.
function detectOrderBlocks(klines: Kline[], structureBreaks: DetectionCandidate[]): DetectionCandidate[] {
  const candidates: DetectionCandidate[] = []
  for (const brk of structureBreaks) {
    const isBullishBreak = brk.key.includes('-up-')
    const breakIndex = klines.findIndex((k) => k.time === brk.timeEnd)
    if (breakIndex < 1) continue

    let obIndex = -1
    for (let j = breakIndex - 1; j >= Math.max(0, breakIndex - MAX_ORDER_BLOCK_LOOKBACK); j--) {
      const candle = klines[j]
      const isBearishCandle = candle.close < candle.open
      const isBullishCandle = candle.close > candle.open
      if (isBullishBreak && isBearishCandle) {
        obIndex = j
        break
      }
      if (!isBullishBreak && isBullishCandle) {
        obIndex = j
        break
      }
    }
    if (obIndex === -1) continue

    const obCandle = klines[obIndex]
    const zoneEndTime = klines[obIndex + 1]?.time ?? obCandle.time
    candidates.push({
      key: `ob-${isBullishBreak ? 'bull' : 'bear'}-${obIndex}`,
      confluenceName: 'Order Block',
      shape: 'square',
      timeStart: obCandle.time,
      priceStart: Math.min(obCandle.open, obCandle.close),
      timeEnd: zoneEndTime,
      priceEnd: Math.max(obCandle.open, obCandle.close),
      rationale: `Última vela ${isBullishBreak ? 'bajista' : 'alcista'} (vela ${obIndex}) antes del impulso que rompió estructura en la vela ${breakIndex} — order block ${isBullishBreak ? 'alcista' : 'bajista'} candidato.`,
    })
  }
  return dedupeByKey(candidates)
}

// Liquidez: dos o más swing highs (o lows) a menos de 0.1% de distancia entre sí —
// zona donde probablemente se acumulan stops, un imán de precio clásico.
function detectLiquidityPools(klines: Kline[]): DetectionCandidate[] {
  const swings = detectSwingPoints(klines)
  const candidates: DetectionCandidate[] = []

  function findEqualPairs(points: SwingPoint[], label: 'high' | 'low') {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i]
        const b = points[j]
        const tolerance = Math.abs(a.price) * LIQUIDITY_TOLERANCE_PCT
        if (Math.abs(a.price - b.price) > tolerance) continue
        candidates.push({
          key: `liq-${label}-${a.index}-${b.index}`,
          confluenceName: 'Liquidez',
          shape: 'square',
          timeStart: a.time,
          priceStart: Math.min(a.price, b.price),
          timeEnd: b.time,
          priceEnd: Math.max(a.price, b.price),
          rationale: `Dos ${label === 'high' ? 'máximos' : 'mínimos'} similares (velas ${a.index} y ${b.index}, diferencia < 0.1%) — posible zona de liquidez.`,
        })
      }
    }
  }

  findEqualPairs(
    swings.filter((s) => s.type === 'high'),
    'high',
  )
  findEqualPairs(
    swings.filter((s) => s.type === 'low'),
    'low',
  )
  return candidates
}

function dedupeByKey(candidates: DetectionCandidate[]): DetectionCandidate[] {
  const seen = new Map<string, DetectionCandidate>()
  for (const candidate of candidates) seen.set(candidate.key, candidate)
  return Array.from(seen.values())
}

// Orquestador: corre los 4 detectores y devuelve los MAX_CANDIDATES más recientes —
// sin este tope, una ventana de velas larga puede generar cientos de candidatos
// (sobre todo liquidez, O(n²) en pares de swings) y saturar tanto la UI como el prompt
// de la IA en la Fase 3.
export function detectConfluenceCandidates(klines: Kline[]): DetectionCandidate[] {
  const structureBreaks = detectStructureBreaks(klines)
  const all = dedupeByKey([
    ...detectFairValueGaps(klines),
    ...structureBreaks,
    ...detectOrderBlocks(klines, structureBreaks),
    ...detectLiquidityPools(klines),
  ])
  return all.sort((a, b) => b.timeStart - a.timeStart).slice(0, MAX_CANDIDATES)
}
