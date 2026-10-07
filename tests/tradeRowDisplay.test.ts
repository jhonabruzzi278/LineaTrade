import { describe, expect, it } from 'vitest'
import { formatDuration, formatR, formatRowResult, formatSignedFixed, formatTradeMoment } from '../src/lib/tradeRowDisplay'

describe('tradeRowDisplay', () => {
  it('formatea números con signo tipográfico y decimales fijos', () => {
    expect(formatSignedFixed(0.6)).toBe('+0.60')
    expect(formatSignedFixed(-1)).toBe('−1.00')
    expect(formatSignedFixed(0)).toBe('0.00')
    expect(formatR(2.1)).toBe('+2.10R')
    expect(formatR(-0.4)).toBe('−0.40R')
  })

  it('prioriza R > monto > precio de entrada en la fila', () => {
    expect(formatRowResult({ pnl_r: 1.9, pnl_amount: 79.8, entry_price: 20418.25 })).toBe('+1.90R')
    expect(formatRowResult({ pnl_r: null, pnl_amount: -25, entry_price: 100 })).toBe('−25.00')
    expect(formatRowResult({ pnl_r: null, pnl_amount: null, entry_price: 20418.25 })).toBe('20418.25')
  })

  it('marca «hoy» solo para el mismo día local', () => {
    const now = new Date(2026, 9, 7, 15, 0)
    expect(formatTradeMoment(new Date(2026, 9, 7, 9, 41).toISOString(), now)).toMatch(/^hoy 09:41$/)
    expect(formatTradeMoment(new Date(2026, 9, 2, 10, 41).toISOString(), now)).toMatch(/^02 oct 10:41$/)
    expect(formatTradeMoment('no-es-fecha', now)).toBe('—')
  })

  it('formatea la duración sin inventar datos', () => {
    expect(formatDuration(72)).toBe('1 h 12 min')
    expect(formatDuration(38)).toBe('38 min')
    expect(formatDuration(120)).toBe('2 h')
    expect(formatDuration(null)).toBeNull()
  })
})
