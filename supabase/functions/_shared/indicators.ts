// Indicadores técnicos puros (RSI/MACD/Bollinger/variación%/spike de volumen) — sin
// dependencias npm, matemática directa sobre un array de cierres/volúmenes. Vive acá
// (Deno, _shared) y no en src/lib/marketData/ porque el cálculo ocurre server-side en
// run-scanner (cron-driven), a diferencia de confluenceDetection.ts (src/lib/), que
// corre client-side porque ahí sí hay un usuario mirando velas ya cargadas en el
// replay. No existía nada de esto en el proyecto antes de esta fase — terreno
// enteramente nuevo, no una reutilización.

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null
  const window = values.slice(values.length - period)
  return window.reduce((a, b) => a + b, 0) / period
}

function stddev(values: number[], period: number, mean: number): number | null {
  if (values.length < period) return null
  const window = values.slice(values.length - period)
  const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
  return Math.sqrt(variance)
}

// EMA sembrada con el primer valor (simplificación estándar y aceptada — la
// alternativa, sembrar con la SMA de los primeros `period` valores, converge al
// mismo resultado después de suficientes velas; acá solo se usa el último valor de
// la serie, ya bien "calentado" con KLINES_LIMIT velas de margen).
function ema(values: number[], period: number): number[] {
  if (values.length === 0) return []
  const k = 2 / (period + 1)
  const result: number[] = [values[0]]
  for (let i = 1; i < values.length; i++) {
    result.push(values[i] * k + result[i - 1] * (1 - k))
  }
  return result
}

// RSI de Wilder (suavizado exponencial de ganancias/pérdidas) — el estándar de facto
// (TradingView y la mayoría de plataformas lo calculan así), no una media simple.
export function calculateRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change >= 0) avgGain += change
    else avgLoss += -change
  }
  avgGain /= period
  avgLoss /= period
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1]
    const gain = change >= 0 ? change : 0
    const loss = change < 0 ? -change : 0
    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return round2(100 - 100 / (1 + rs))
}

export interface MACDResult {
  line: number
  signal: number
  histogram: number
}

export function calculateMACD(closes: number[], fast = 12, slow = 26, signalPeriod = 9): MACDResult | null {
  if (closes.length < slow + signalPeriod) return null
  const emaFast = ema(closes, fast)
  const emaSlow = ema(closes, slow)
  const macdLine = closes.map((_, i) => emaFast[i] - emaSlow[i])
  const signalLine = ema(macdLine, signalPeriod)
  const lastIndex = closes.length - 1
  const line = macdLine[lastIndex]
  const signal = signalLine[lastIndex]
  return { line: round2(line), signal: round2(signal), histogram: round2(line - signal) }
}

export interface BollingerResult {
  upper: number
  lower: number
  percentB: number
}

export function calculateBollingerBands(closes: number[], period = 20, multiplier = 2): BollingerResult | null {
  const mean = sma(closes, period)
  if (mean === null) return null
  const sd = stddev(closes, period, mean)
  if (sd === null) return null
  const upper = mean + multiplier * sd
  const lower = mean - multiplier * sd
  const lastClose = closes[closes.length - 1]
  const percentB = upper === lower ? 0.5 : (lastClose - lower) / (upper - lower)
  return { upper: round2(upper), lower: round2(lower), percentB: round2(percentB) }
}

export function calculatePriceChangePct(closes: number[]): number | null {
  if (closes.length < 2) return null
  const first = closes[0]
  const last = closes[closes.length - 1]
  if (first === 0) return null
  return round2(((last - first) / first) * 100)
}

// Volumen de la última vela contra el promedio de todas las anteriores en la ventana
// — un valor de 3 significa "el triple del volumen promedio reciente".
export function calculateVolumeSpikeRatio(volumes: number[]): number | null {
  if (volumes.length < 2) return null
  const last = volumes[volumes.length - 1]
  const priorAvg = sma(volumes.slice(0, -1), volumes.length - 1)
  if (!priorAvg) return null
  return round2(last / priorAvg)
}
