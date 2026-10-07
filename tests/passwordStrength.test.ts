import { describe, expect, it } from 'vitest'
import { getPasswordStrength } from '../src/lib/passwordStrength'

describe('getPasswordStrength', () => {
  it('pide el mínimo cuando el campo está vacío', () => {
    const result = getPasswordStrength('')
    expect(result.level).toBe(0)
    expect(result.meetsMinimum).toBe(false)
  })

  it('marca como muy corta una contraseña bajo 8 caracteres', () => {
    const result = getPasswordStrength('Ab1!xyz')
    expect(result.level).toBe(0)
    expect(result.meetsMinimum).toBe(false)
    expect(result.label).toContain('Muy corta')
  })

  it('acepta 8 caracteres simples como nivel 1', () => {
    const result = getPasswordStrength('abcdefgh')
    expect(result.level).toBe(1)
    expect(result.meetsMinimum).toBe(true)
  })

  it('sube a nivel 2 con variedad o con largo, pero no con ambos', () => {
    expect(getPasswordStrength('Abcdef1!').level).toBe(2)
    expect(getPasswordStrength('abcdefghijkl').level).toBe(2)
  })

  it('llega a nivel 3 con 12+ caracteres y tres tipos de caracter', () => {
    const result = getPasswordStrength('Abcdefghij1!')
    expect(result.level).toBe(3)
    expect(result.label).toBe('Fuerte')
  })
})
