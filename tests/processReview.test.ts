import { describe, expect, it } from 'vitest'
import { PROCESS_REVIEW_QUESTIONS } from '../src/data/lessons/primerTradePapermoney'
import { summarizeProcessReview } from '../src/lib/processReview'

const allYes = Object.fromEntries(PROCESS_REVIEW_QUESTIONS.map((question) => [question.id, true]))

describe('summarizeProcessReview', () => {
  it('no resume mientras falte alguna respuesta', () => {
    expect(summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, {})).toBeNull()
    expect(summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, { ...allYes, 'stop-fijo': undefined as unknown as boolean })).toBeNull()
  })

  it('con todo en Sí, el proceso es 5 de 5 sin fallos', () => {
    const summary = summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, allYes)
    expect(summary).toMatchObject({ followed: 5, total: 5, flaws: [] })
    expect(summary?.message).toMatch(/plan de principio a fin/)
  })

  it('un No cuenta como fallo y lo nombra', () => {
    const summary = summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, { ...allYes, 'stop-fijo': false })
    expect(summary).toMatchObject({ followed: 4, total: 5, flaws: ['moviste el stop'] })
    expect(summary?.message).toContain('moviste el stop')
  })

  it('une varios fallos con comas y «y»', () => {
    const summary = summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, { ...allYes, 'stop-fijo': false, 'registro-dia': false, 'plan-previo': false })
    expect(summary?.followed).toBe(2)
    expect(summary?.message).toContain('entraste sin el plan escrito, moviste el stop y no lo registraste el mismo día')
  })

  it('no menciona resultados en dinero: evalúa el proceso, no el resultado', () => {
    const summary = summarizeProcessReview(PROCESS_REVIEW_QUESTIONS, { ...allYes, 'stop-fijo': false })
    expect(summary?.message).not.toMatch(/ganaste|perdiste|ganancia|pérdida/i)
  })
})
