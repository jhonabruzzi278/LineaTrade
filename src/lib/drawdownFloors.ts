// Modelo didáctico de los tres tipos de piso de drawdown que usan las firmas de
// fondeo. Es un ejemplo ilustrativo, no las reglas de ninguna firma concreta.

export interface DrawdownDay {
  /** Saldo al cierre del día. */
  close: number
  /** Máximo del saldo durante el día, con ganancias abiertas incluidas. */
  peak: number
}

export interface DrawdownScenario {
  initialBalance: number
  /** Monto máximo que puedes perder desde el piso (p. ej. 2,000). */
  drawdown: number
  /** Día 0 es el saldo inicial; los siguientes son sesiones. */
  days: readonly DrawdownDay[]
}

export interface DrawdownFloors {
  balance: number[]
  trailingIntraday: number[]
  trailingEod: number[]
  static: number[]
}

/**
 * Calcula el piso de cada tipo de cuenta día por día. Los pisos trailing suben
 * con el máximo (intradía) o con el máximo de cierres (EOD) y se bloquean en el
 * saldo inicial; el estático nunca se mueve.
 */
export function computeDrawdownFloors(scenario: DrawdownScenario): DrawdownFloors {
  const { initialBalance, drawdown, days } = scenario
  const lock = initialBalance
  let maxPeak = initialBalance
  let maxClose = initialBalance

  const trailingIntraday: number[] = []
  const trailingEod: number[] = []
  days.forEach((day) => {
    maxPeak = Math.max(maxPeak, day.peak, day.close)
    maxClose = Math.max(maxClose, day.close)
    trailingIntraday.push(Math.min(lock, maxPeak - drawdown))
    trailingEod.push(Math.min(lock, maxClose - drawdown))
  })

  return {
    balance: days.map((day) => day.close),
    trailingIntraday,
    trailingEod,
    static: days.map(() => initialBalance - drawdown),
  }
}

/** Ejemplo de la lección: cuenta de 50,000 con drawdown de 2,000 durante 5 días. */
export const DRAWDOWN_EXAMPLE: DrawdownScenario = {
  initialBalance: 50_000,
  drawdown: 2_000,
  days: [
    { close: 50_000, peak: 50_000 },
    { close: 50_800, peak: 51_400 },
    { close: 51_500, peak: 52_200 },
    { close: 50_900, peak: 51_300 },
    { close: 52_300, peak: 52_600 },
  ],
}
