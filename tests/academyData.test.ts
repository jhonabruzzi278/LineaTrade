import { describe, expect, it } from 'vitest'
import { academyLessons, academyModules, academyTotalMinutes, formatAcademyDuration, getNextAcademyLesson } from '../src/data/academy'
import { filterGlossary, glossaryById, glossaryTerms } from '../src/data/glossary'
import { lessonContent } from '../src/data/lessonContent'
import type { LessonBlock, Rich } from '../src/data/lessonTypes'

// IDs publicados antes del rediseño: el progreso guardado depende de ellos.
const LEGACY_LESSON_IDS = [
  'bienvenida', 'futuros-indices', 'riesgo-r', 'sesiones', 'disciplina',
  'workspace', 'contratos', 'calendario', 'niveles', 'rutina',
  'estructura-base', 'bias-htf', 'pdh-pdl', 'sesion-asia', 'narrativa', 'review-estructura',
  'liquidez-base', 'sweeps', 'fvg', 'order-blocks', 'confluencia',
  'setup', 'compliance', 'entry-stop', 'gestion', 'journal-review', 'discipline-score',
]

function termsIn(rich: Rich): string[] {
  return rich.flatMap((segment) => (typeof segment === 'object' && 'term' in segment ? [segment.term] : []))
}

function termsInBlock(block: LessonBlock): string[] {
  switch (block.type) {
    case 'paragraph':
    case 'callout':
      return termsIn(block.content)
    case 'definitions':
      return block.items.flatMap((item) => termsIn(item.content))
    case 'steps':
      return block.steps.flatMap((step) => termsIn(step.content))
    default:
      return []
  }
}

describe('estructura de la Academia', () => {
  it('tiene 6 módulos y 35 lecciones', () => {
    expect(academyModules).toHaveLength(6)
    expect(academyLessons).toHaveLength(35)
    expect(academyModules.map((module) => module.number)).toEqual(['01', '02', '03', '04', '05', '06'])
  })

  it('conserva todos los IDs de lección ya publicados', () => {
    const ids = new Set(academyLessons.map((lesson) => lesson.id))
    LEGACY_LESSON_IDS.forEach((id) => expect(ids.has(id), id).toBe(true))
  })

  it('no repite IDs de lección ni de módulo', () => {
    expect(new Set(academyLessons.map((lesson) => lesson.id)).size).toBe(academyLessons.length)
    expect(new Set(academyModules.map((module) => module.id)).size).toBe(academyModules.length)
  })

  it('el módulo de riesgo y fondeo tiene las 7 lecciones del diseño', () => {
    const module = academyModules.find((item) => item.id === 'riesgo-fondeo')
    expect(module?.lessons.map((lesson) => lesson.title)).toEqual([
      'Qué es el drawdown',
      'Trailing, EOD y estático',
      'Límite diario y objetivo',
      'Consistencia y días mínimos',
      'Tamaño de posición',
      'Cómo funciona una evaluación',
      'Elegir una firma sin sesgo',
    ])
    expect(module?.durationMinutes).toBe(67)
  })

  it('«Tu primer trade en papermoney» cierra el módulo 2', () => {
    const module = academyModules[1]
    expect(module.lessons.at(-1)?.id).toBe('primer-trade-papermoney')
    expect(module.durationMinutes).toBe(62)
  })

  it('suma las duraciones del diseño: 5 h 55 min en total', () => {
    expect(academyTotalMinutes).toBe(355)
    expect(formatAcademyDuration(academyTotalMinutes)).toBe('5 h 55 min')
    expect(formatAcademyDuration(62)).toBe('1 h 02 min')
  })

  it('el orden recomendado cruza de módulo y termina en la última lección', () => {
    expect(getNextAcademyLesson('primer-trade-papermoney')?.id).toBe('que-es-drawdown')
    expect(getNextAcademyLesson('discipline-score')).toBeNull()
    expect(getNextAcademyLesson('no-existe')).toBeNull()
  })
})

describe('contenido de lecciones', () => {
  it('solo describe lecciones que existen', () => {
    const ids = new Set(academyLessons.map((lesson) => lesson.id))
    Object.keys(lessonContent).forEach((id) => expect(ids.has(id), id).toBe(true))
  })

  it('todos los términos subrayados existen en el glosario', () => {
    Object.values(lessonContent).forEach((content) => {
      if (!content) return
      const used = [...termsIn(content.objective), ...content.blocks.flatMap(termsInBlock)]
      used.forEach((id) => expect(glossaryById.has(id), id).toBe(true))
    })
  })
})

describe('glosario', () => {
  it('cada término enlaza con una lección real y no repite IDs', () => {
    const lessonIds = new Set(academyLessons.map((lesson) => lesson.id))
    glossaryTerms.forEach((term) => {
      if (term.lessonId) expect(lessonIds.has(term.lessonId), term.id).toBe(true)
    })
    expect(new Set(glossaryTerms.map((term) => term.id)).size).toBe(glossaryTerms.length)
  })

  it('incluye los términos pedidos', () => {
    const required = [
      'drawdown', 'drawdown-trailing-intradia', 'drawdown-trailing-eod', 'drawdown-estatico',
      'limite-perdida-diaria', 'objetivo-ganancia', 'regla-consistencia', 'r-multiplo', 'expectativa',
      'profit-factor', 'win-rate', 'stop', 'tamano-posicion', 'papermoney', 'fvg', 'ob', 'ob-50',
    ]
    required.forEach((id) => expect(glossaryById.has(id), id).toBe(true))
  })

  it('filtra por categoría', () => {
    const fondeo = filterGlossary(glossaryTerms, '', 'fondeo')
    expect(fondeo.length).toBeGreaterThan(0)
    expect(fondeo.every((term) => term.category === 'fondeo')).toBe(true)
    expect(filterGlossary(glossaryTerms, '', 'todo')).toHaveLength(glossaryTerms.length)
  })

  it('busca sin distinguir tildes ni mayúsculas, en término y definición', () => {
    expect(filterGlossary(glossaryTerms, 'EXPECTATIVA', 'todo').map((term) => term.id)).toContain('expectativa')
    expect(filterGlossary(glossaryTerms, 'perdida diaria', 'todo').map((term) => term.id)).toContain('limite-perdida-diaria')
    expect(filterGlossary(glossaryTerms, 'zzz', 'todo')).toEqual([])
  })

  it('combina búsqueda y categoría', () => {
    const result = filterGlossary(glossaryTerms, 'drawdown', 'riesgo')
    expect(result.map((term) => term.id)).toEqual(['drawdown'])
  })
})
