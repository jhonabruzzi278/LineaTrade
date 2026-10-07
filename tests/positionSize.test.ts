import { describe, expect, it } from 'vitest'
import {
  breakEvenWinRate,
  calculatePositionSize,
  formatR,
  formatSignedAmount,
  parseDecimalInput,
  type PositionSizeInput,
} from '../src/lib/positionSize'

const EXAMPLE: PositionSizeInput = {
  balance: 10_000,
  riskPercent: 1,
  entry: 190,
  stop: 188,
  target: 194,
  direction: 'long',
}

function ok(input: PositionSizeInput) {
  const outcome = calculatePositionSize(input)
  if (!outcome.ok) throw new Error(`se esperaba un resultado válido: ${outcome.issues.join(', ')}`)
  return outcome.result
}

describe('calculatePositionSize', () => {
  it('calcula el ejemplo de la lección: 1 % de 10,000 con stop a 2.00 son 50 unidades', () => {
    const result = ok(EXAMPLE)
    expect(result.riskAmount).toBe(100)
    expect(result.stopDistance).toBe(2)
    expect(result.targetDistance).toBe(4)
    expect(result.size).toBe(50)
    expect(result.lossAtStop).toBe(100)
    expect(result.gainAtTarget).toBe(200)
    expect(result.rAtStop).toBe(-1)
    expect(result.rAtTarget).toBe(2)
    expect(result.rewardToRisk).toBe(2)
  })

  it('redondea el tamaño hacia abajo para no pasarse del riesgo', () => {
    const result = ok({ ...EXAMPLE, entry: 190, stop: 187 })
    expect(result.size).toBe(33)
    expect(result.lossAtStop).toBe(99)
    expect(result.rAtStop).toBeCloseTo(-0.99, 10)
    expect(result.lossAtStop).toBeLessThanOrEqual(result.riskAmount)
  })

  it('devuelve tamaño 0 cuando el stop está tan lejos que ni una unidad cabe en el riesgo', () => {
    const result = ok({ ...EXAMPLE, balance: 100, riskPercent: 1, stop: 180 })
    expect(result.size).toBe(0)
    expect(result.lossAtStop).toBe(0)
  })

  it('funciona en corto con stop arriba y objetivo abajo', () => {
    const result = ok({ ...EXAMPLE, direction: 'short', entry: 190, stop: 192, target: 186 })
    expect(result.size).toBe(50)
    expect(result.rAtTarget).toBe(2)
    expect(result.gainAtTarget).toBe(200)
  })

  it('acepta riesgos fraccionarios', () => {
    const result = ok({ ...EXAMPLE, riskPercent: 0.5 })
    expect(result.riskAmount).toBe(50)
    expect(result.size).toBe(25)
  })

  it('calcula el porcentaje de aciertos mínimo: con 1 a 2 hace falta 1 de cada 3', () => {
    expect(ok(EXAMPLE).breakEvenWinRate).toBeCloseTo(1 / 3, 10)
    expect(breakEvenWinRate(1)).toBe(0.5)
  })

  it('rechaza entradas no positivas o no numéricas', () => {
    const outcome = calculatePositionSize({ ...EXAMPLE, balance: 0, riskPercent: Number.NaN, entry: -1 })
    expect(outcome).toEqual({ ok: false, issues: ['balance', 'risk', 'entry'] })
  })

  it('rechaza un riesgo mayor a 100 %', () => {
    expect(calculatePositionSize({ ...EXAMPLE, riskPercent: 101 })).toEqual({ ok: false, issues: ['risk'] })
  })

  it('rechaza stop igual a la entrada', () => {
    expect(calculatePositionSize({ ...EXAMPLE, stop: 190 })).toEqual({ ok: false, issues: ['stop-same-as-entry'] })
  })

  it('rechaza un stop del lado equivocado según la dirección', () => {
    expect(calculatePositionSize({ ...EXAMPLE, stop: 192 })).toEqual({ ok: false, issues: ['stop-wrong-side'] })
    expect(calculatePositionSize({ ...EXAMPLE, direction: 'short' })).toEqual({
      ok: false,
      issues: ['stop-wrong-side', 'target-wrong-side'],
    })
  })

  it('rechaza un objetivo del lado equivocado o igual a la entrada', () => {
    expect(calculatePositionSize({ ...EXAMPLE, target: 189 })).toEqual({ ok: false, issues: ['target-wrong-side'] })
    expect(calculatePositionSize({ ...EXAMPLE, target: 190 })).toEqual({ ok: false, issues: ['target-wrong-side'] })
  })
})

describe('parseDecimalInput', () => {
  it.each([
    ['10,000', 10000],
    ['10.000.000', 10000000],
    ['1,234.56', 1234.56],
    ['1.234,56', 1234.56],
    ['190.25', 190.25],
    ['1.085', 1.085],
    ['1,5', 1.5],
    ['0,5', 0.5],
    ['1%', 1],
    [' 2.5 % ', 2.5],
    ['10 000', 10000],
    ['194', 194],
  ])('interpreta %s como %d', (raw, expected) => {
    expect(parseDecimalInput(raw)).toBeCloseTo(expected, 10)
  })

  it.each(['', 'abc', '-5', '1e3', '1..2.x', '%'])('devuelve null para %j', (raw) => {
    expect(parseDecimalInput(raw)).toBeNull()
  })
})

describe('formato de resultados', () => {
  it('formatSignedAmount usa signo explícito', () => {
    expect(formatSignedAmount(200)).toBe('+200')
    expect(formatSignedAmount(-100)).toBe('−100')
    expect(formatSignedAmount(0)).toBe('0')
    expect(formatSignedAmount(1234.5)).toBe('+1,234.5')
  })

  it('formatR recorta decimales sobrantes', () => {
    expect(formatR(-1)).toBe('−1R')
    expect(formatR(2)).toBe('+2R')
    expect(formatR(-0.99)).toBe('−0.99R')
    expect(formatR(1.5)).toBe('+1.5R')
    expect(formatR(0)).toBe('0R')
  })
})
