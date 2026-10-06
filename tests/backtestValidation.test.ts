import { describe, expect, it } from 'vitest'
import { isBlankOrPositiveNumber, parsePositiveNumber } from '../src/lib/backtestValidation'

describe('backtestValidation', () => {
  it('acepta números positivos finitos', () => {
    expect(parsePositiveNumber('12.5')).toBe(12.5)
    expect(parsePositiveNumber(' 1 ')).toBe(1)
  })

  it('rechaza cero, negativos y texto', () => {
    expect(parsePositiveNumber('0')).toBeNull()
    expect(parsePositiveNumber('-1')).toBeNull()
    expect(parsePositiveNumber('abc')).toBeNull()
    expect(parsePositiveNumber('Infinity')).toBeNull()
  })

  it('permite vacío para campos opcionales', () => {
    expect(isBlankOrPositiveNumber('')).toBe(true)
    expect(isBlankOrPositiveNumber('   ')).toBe(true)
    expect(isBlankOrPositiveNumber('-3')).toBe(false)
  })
})
