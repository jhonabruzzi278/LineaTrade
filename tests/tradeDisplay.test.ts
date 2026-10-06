import { describe, expect, it } from 'vitest'
import {
  combineDateTimeToIso,
  formatSigned,
  formatTradeResult,
  isValidDateString,
  isValidTimeString,
  signedTone,
  tradeResultColorClass,
} from '../src/lib/tradeDisplay'

describe('tradeDisplay', () => {
  it('prioriza R sobre P&L y precio de entrada', () => {
    expect(formatTradeResult({ pnl_r: 1.5, pnl_amount: 300, entry_price: 100 })).toBe('+1.5R')
    expect(formatTradeResult({ pnl_r: null, pnl_amount: -25, entry_price: 100 })).toBe('-25')
    expect(formatTradeResult({ pnl_r: null, pnl_amount: null, entry_price: 100 })).toBe('100')
  })

  it('no presenta un trade abierto como ganancia o pérdida', () => {
    expect(tradeResultColorClass({ pnl_r: null, pnl_amount: null, entry_price: 100 })).toBe('text-text-muted')
    expect(signedTone(null)).toBe('default')
    expect(signedTone(0)).toBe('gain')
    expect(signedTone(-0.4)).toBe('loss')
  })

  it('formatea valores con signo sin inventar datos faltantes', () => {
    expect(formatSigned(0.8)).toBe('+0.8')
    expect(formatSigned(-0.8)).toBe('-0.8')
    expect(formatSigned(null)).toBe('—')
  })

  it('valida fecha y hora antes de crear el ISO', () => {
    expect(isValidDateString('2026-08-14')).toBe(true)
    expect(isValidDateString('14-08-2026')).toBe(false)
    expect(isValidTimeString('09:30')).toBe(true)
    expect(isValidTimeString('9:30')).toBe(false)
    expect(combineDateTimeToIso('2026-08-14', '09:30')).toContain('2026-08-14T')
  })
})
