import { describe, expect, it } from 'vitest'
import { computeDrawdownFloors, DRAWDOWN_EXAMPLE } from '../src/lib/drawdownFloors'

describe('computeDrawdownFloors', () => {
  const floors = computeDrawdownFloors(DRAWDOWN_EXAMPLE)

  it('el piso estático no se mueve nunca', () => {
    expect(floors.static).toEqual([48_000, 48_000, 48_000, 48_000, 48_000])
  })

  it('el trailing EOD solo sube con el máximo de cierres y se bloquea en el saldo inicial', () => {
    expect(floors.trailingEod).toEqual([48_000, 48_800, 49_500, 49_500, 50_000])
  })

  it('el trailing intradía sigue el máximo en tiempo real y se bloquea antes', () => {
    expect(floors.trailingIntraday).toEqual([48_000, 49_400, 50_000, 50_000, 50_000])
  })

  it('el trailing intradía nunca queda por debajo del EOD (da menos margen)', () => {
    floors.trailingIntraday.forEach((value, index) => {
      expect(value).toBeGreaterThanOrEqual(floors.trailingEod[index])
    })
  })

  it('ningún piso baja con el tiempo', () => {
    for (const series of [floors.trailingIntraday, floors.trailingEod, floors.static]) {
      series.forEach((value, index) => {
        if (index > 0) expect(value).toBeGreaterThanOrEqual(series[index - 1])
      })
    }
  })

  it('el saldo se copia tal cual', () => {
    expect(floors.balance).toEqual([50_000, 50_800, 51_500, 50_900, 52_300])
  })
})
