import { describe, expect, it } from 'vitest'
import { factName, progressToMinimum, sufficiencyFromCount, sufficiencyLabel } from '../src/lib/insightsView'

describe('insightsView', () => {
  it('usa los umbrales <5, 5–19 y ≥20', () => {
    expect(sufficiencyFromCount(0)).toBe('insufficient')
    expect(sufficiencyFromCount(4)).toBe('insufficient')
    expect(sufficiencyFromCount(5)).toBe('limited')
    expect(sufficiencyFromCount(19)).toBe('limited')
    expect(sufficiencyFromCount(20)).toBe('sufficient')
  })

  it('etiqueta con el número de trades', () => {
    expect(sufficiencyLabel('sufficient', 21)).toBe('Datos suficientes · 21 trades')
    expect(sufficiencyLabel('insufficient', 1)).toBe('Datos insuficientes todavía · 1 trade')
    expect(sufficiencyLabel('limited', null)).toBe('Datos limitados')
  })

  it('calcula el avance hacia 5 trades', () => {
    expect(progressToMinimum(3)).toBe(60)
    expect(progressToMinimum(9)).toBe(100)
  })

  it('toma el último segmento de la ruta citada', () => {
    expect(factName('aggregate_stats.by_weekday.0.win_rate')).toBe('win_rate')
    expect(factName('plain')).toBe('plain')
  })
})
