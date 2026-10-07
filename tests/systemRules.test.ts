import { describe, expect, it } from 'vitest'
import {
  defaultObjectiveTitle,
  describeStrategyStats,
  formatObjectiveValue,
  isJournalVerifiedRule,
  isObjectiveReached,
  objectiveProgress,
} from '../src/lib/systemRules'

describe('isJournalVerifiedRule', () => {
  it('reconoce reglas sobre no mover el stop', () => {
    expect(isJournalVerifiedRule('No mover el stop una vez enviada la orden')).toBe(true)
    expect(isJournalVerifiedRule('Nunca muevo el STOP en contra')).toBe(true)
    expect(isJournalVerifiedRule('No muevas el stop loss')).toBe(true)
  })

  it('deja el resto como revisión manual', () => {
    expect(isJournalVerifiedRule('Riesgo máximo de 1R por trade')).toBe(false)
    expect(isJournalVerifiedRule('Máximo 2 trades por día')).toBe(false)
    expect(isJournalVerifiedRule('Poner stop siempre antes de entrar')).toBe(false)
  })
})

describe('objetivos', () => {
  it('formatea los valores con la unidad de su métrica', () => {
    expect(formatObjectiveValue('win_rate', 58)).toBe('58%')
    expect(formatObjectiveValue('r_avg', 0.4)).toBe('+0.4R')
    expect(formatObjectiveValue('r_avg', -0.25)).toBe('-0.25R')
    expect(formatObjectiveValue('profit_factor', 1.3)).toBe('1.3')
    expect(formatObjectiveValue('custom', null)).toBe('—')
  })

  it('genera un título automático por métrica', () => {
    expect(defaultObjectiveTitle('win_rate', 55)).toBe('Win rate de 55% o más')
    expect(defaultObjectiveTitle('profit_factor', 1.5)).toBe('Profit factor de 1.5')
    expect(defaultObjectiveTitle('r_avg', 0.5)).toBe('R promedio de +0.5R')
    expect(defaultObjectiveTitle('custom', 20)).toBe('')
  })

  it('calcula el avance sin pasarse de 100 ni inventar valores', () => {
    expect(objectiveProgress(1.3, 1.5)).toBe(87)
    expect(objectiveProgress(58, 55)).toBe(100)
    expect(objectiveProgress(null, 55)).toBe(0)
    expect(objectiveProgress(-1, 55)).toBe(0)
    expect(objectiveProgress(10, 0)).toBe(0)
  })

  it('marca como alcanzado al igualar o superar la meta', () => {
    expect(isObjectiveReached(55, 55)).toBe(true)
    expect(isObjectiveReached(54.9, 55)).toBe(false)
    expect(isObjectiveReached(null, 55)).toBe(false)
  })
})

describe('describeStrategyStats', () => {
  it('no cita win rate con pocos trades', () => {
    expect(describeStrategyStats(5, 80)).toBe('5 trades · pocos datos para concluir')
    expect(describeStrategyStats(1, 100)).toBe('1 trade · pocos datos para concluir')
  })

  it('cita win rate con muestra suficiente', () => {
    expect(describeStrategyStats(12, 66.67)).toBe('12 trades · win rate 66.67%')
  })

  it('indica cuando no hay trades', () => {
    expect(describeStrategyStats(0, null)).toBe('Sin trades todavía')
    expect(describeStrategyStats(null, null)).toBe('Sin trades todavía')
  })
})
