import { describe, expect, it } from 'vitest'
import { emptyTechnicalEntry, hasRequiredTechnicalFields, localDateString, mergeExtraction } from '../src/lib/tradeDraft'
import type { ExtractedTradeData } from '../src/lib/tradeImageExtraction'

const NOW = new Date(2026, 9, 7, 9, 5)

const EMPTY_EXTRACTION: ExtractedTradeData = {
  market: null,
  symbol: null,
  action: null,
  option_type: null,
  strike_price: null,
  expiration_date: null,
  date: null,
  time: null,
  quantity: null,
  price: null,
  commission: null,
  order_number: null,
  order_placed_time: null,
  price_type: null,
  limit_price: null,
  bid_price: null,
  ask_price: null,
  term: null,
  all_or_none: null,
}

describe('tradeDraft', () => {
  it('arranca con fecha y hora locales', () => {
    const draft = emptyTechnicalEntry(NOW)
    expect(draft.date).toBe('2026-10-07')
    expect(draft.time).toBe('09:05')
    expect(draft.photoAttached).toBe(false)
    expect(localDateString(new Date(2026, 0, 3))).toBe('2026-01-03')
  })

  it('conserva el borrador cuando la IA no extrae nada', () => {
    const base = { ...emptyTechnicalEntry(NOW), symbol: 'NQ', price: '100' }
    const merged = mergeExtraction(base, EMPTY_EXTRACTION)
    expect(merged.symbol).toBe('NQ')
    expect(merged.price).toBe('100')
    expect(merged.photoAttached).toBe(true)
  })

  it('aplica lo extraído y descarta fechas y horas con formato inválido', () => {
    const merged = mergeExtraction(emptyTechnicalEntry(NOW), {
      ...EMPTY_EXTRACTION,
      market: 'futures',
      symbol: 'MNQ',
      action: 'short',
      quantity: 2,
      price: 20418.25,
      date: '06/10/2026',
      time: '09:41',
      order_number: 'A-1',
    })
    expect(merged.market).toBe('futures')
    expect(merged.action).toBe('short')
    expect(merged.quantity).toBe('2')
    expect(merged.price).toBe('20418.25')
    expect(merged.date).toBe('2026-10-07')
    expect(merged.time).toBe('09:41')
    expect(merged.orderTicket.orderNumber).toBe('A-1')
  })

  it('exige strike y vencimiento solo para opciones', () => {
    const base = { ...emptyTechnicalEntry(NOW), market: 'futures', symbol: 'ES', quantity: '1', price: '5700' }
    expect(hasRequiredTechnicalFields(base)).toBe(true)
    expect(hasRequiredTechnicalFields({ ...base, symbol: '' })).toBe(false)
    const option = { ...base, market: 'options' }
    expect(hasRequiredTechnicalFields(option)).toBe(false)
    expect(hasRequiredTechnicalFields({ ...option, strikePrice: '5700', expirationDate: '2026-12-18' })).toBe(true)
  })
})
