import { describe, expect, it } from 'vitest'
import { formatRelativeTime, splitIntoKeyPoints } from '../src/lib/newsView'

describe('splitIntoKeyPoints', () => {
  it('toma hasta tres oraciones literales del resumen', () => {
    const summary = 'La Fed dejó las tasas. El Nasdaq opera sin rumbo. El mercado espera guía. Una cuarta oración.'
    expect(splitIntoKeyPoints(summary)).toEqual(['La Fed dejó las tasas.', 'El Nasdaq opera sin rumbo.', 'El mercado espera guía.'])
  })

  it('no inventa puntos si el resumen es una sola oración', () => {
    expect(splitIntoKeyPoints('Una sola oración.')).toEqual([])
    expect(splitIntoKeyPoints('')).toEqual([])
  })
})

const NOW = new Date('2026-09-30T12:00:00Z')
const minus = (ms: number) => new Date(NOW.getTime() - ms).toISOString()

describe('formatRelativeTime', () => {
  it('formatea minutos, horas y días', () => {
    expect(formatRelativeTime(minus(10_000), NOW)).toBe('ahora')
    expect(formatRelativeTime(minus(25 * 60_000), NOW)).toBe('hace 25 min')
    expect(formatRelativeTime(minus(3 * 3_600_000), NOW)).toBe('hace 3 h')
    expect(formatRelativeTime(minus(2 * 86_400_000), NOW)).toBe('hace 2 d')
  })

  it('pasada una semana muestra la fecha corta', () => {
    expect(formatRelativeTime(new Date(2026, 6, 20, 12).toISOString(), NOW)).toBe('20 jul')
  })
})
