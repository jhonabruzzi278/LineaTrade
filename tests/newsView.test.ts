import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from '../src/lib/newsView'

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
