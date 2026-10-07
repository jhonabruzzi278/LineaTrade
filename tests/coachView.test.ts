import { describe, expect, it } from 'vitest'
import { groupConversations, titleFromFirstMessage } from '../src/lib/coachView'

const NOW = new Date(2026, 9, 7, 15, 0, 0)
const at = (daysAgo: number, hour = 9) => new Date(2026, 9, 7 - daysAgo, hour).toISOString()

describe('groupConversations', () => {
  it('agrupa por recencia y omite grupos vacíos', () => {
    const groups = groupConversations(
      [
        { id: 'a', updated_at: at(0) },
        { id: 'b', updated_at: at(1) },
        { id: 'c', updated_at: at(4) },
        { id: 'd', updated_at: at(20) },
      ],
      NOW,
    )
    expect(groups.map((g) => g.label)).toEqual(['Hoy', 'Ayer', 'Esta semana', 'Anteriores'])
    expect(groups[0].items[0].id).toBe('a')
    expect(groupConversations([{ id: 'x', updated_at: at(0) }], NOW)).toHaveLength(1)
  })

  it('devuelve una lista vacía sin conversaciones', () => {
    expect(groupConversations([], NOW)).toEqual([])
  })
})

describe('titleFromFirstMessage', () => {
  it('compacta espacios y recorta los títulos largos', () => {
    expect(titleFromFirstMessage('  ¿En   qué\ndías? ')).toBe('¿En qué días?')
    const long = titleFromFirstMessage('a'.repeat(100))
    expect(long.length).toBe(60)
    expect(long.endsWith('…')).toBe(true)
  })
})
