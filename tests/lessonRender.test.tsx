import { renderToStaticMarkup } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LessonBody } from '../src/components/academy/LessonBody'
import type { LessonPracticeApi } from '../src/components/academy/LessonSteps'
import { lessonContent } from '../src/data/lessonContent'
import type { LessonPracticeState } from '../src/hooks/useLessonPractice'

function fakePractice(state: Partial<LessonPracticeState> = {}): LessonPracticeApi {
  return {
    state: { doneSteps: [], plan: null, answers: {}, ...state },
    setStepDone: () => undefined,
    savePlan: () => undefined,
    setAnswer: () => undefined,
    resetReview: () => undefined,
  }
}

function render(lessonId: string, practice = fakePractice()): string {
  const content = lessonContent[lessonId]
  if (!content) throw new Error(`sin contenido: ${lessonId}`)
  return renderToStaticMarkup(
    <StaticRouter location={`/academia/lecciones/${lessonId}`}>
      <LessonBody blocks={content.blocks} practice={practice} />
    </StaticRouter>,
  )
}

describe('lección «Trailing, EOD y estático»', () => {
  const html = render('trailing-eod-estatico')

  it('dibuja el gráfico accesible con su descripción y los tres tipos de cuenta', () => {
    expect(html).toContain('role="img"')
    expect(html).toContain('Gráfico: saldo al cierre y piso de drawdown trailing intradía, trailing EOD y estático durante 5 días')
    expect(html).toContain('Trailing intradía')
    expect(html).toContain('Trailing EOD (cierre del día)')
    expect(html).toContain('Estático')
  })

  it('distingue los tipos por trazo, no por rojo ni verde', () => {
    expect(html).not.toMatch(/stroke-(gain|loss)|fill-(gain|loss)|text-(gain|loss)/)
    expect(html).toContain('stroke-dasharray="9 5"')
    expect(html).toContain('stroke-dasharray="1 6"')
  })

  it('incluye una tabla de datos para lectores de pantalla con los pisos calculados', () => {
    expect(html).toContain('<table class="sr-only">')
    expect(html).toContain('49,400')
  })

  it('la acción del simulador aparece deshabilitada como próximamente', () => {
    expect(html).toContain('Abrir el simulador de fondeo')
    expect(html).toContain('Próximamente')
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Abrir el simulador de fondeo/)
  })
})

describe('lección «Tu primer trade en papermoney»', () => {
  const html = render('primer-trade-papermoney')

  it('muestra los cinco pasos como datos de la lección', () => {
    ;['Abre tu cuenta demo', 'Escribe tu plan antes de entrar', 'Ejecuta con el stop y el objetivo ya puestos', 'Regístralo en tu journal como práctica', 'Revisa el proceso, no el resultado'].forEach((title) => {
      expect(html).toContain(title)
    })
  })

  it('la calculadora arranca con el ejemplo y calcula 50 unidades con −1R y +2R', () => {
    expect(html).toContain('Calculadora de tamaño')
    expect(html).toContain('50 <span')
    expect(html).toContain('−100 · −1R')
    expect(html).toContain('+200 · +2R')
    expect(html).toContain('al menos 33.3 % de tus trades')
  })

  it('los pasos marcados se reflejan en el estado de cada marcador', () => {
    const marked = render('primer-trade-papermoney', fakePractice({ doneSteps: ['cuenta-demo'] }))
    expect(marked).toContain('Paso 1 hecho')
    expect(marked).toContain('Marcar el paso 2 como hecho')
  })

  it('la revisión pide las cinco respuestas antes de resumir', () => {
    expect(html).toContain('Responde las cinco preguntas')
    const answered = render('primer-trade-papermoney', fakePractice({ answers: { 'plan-previo': true, 'precio-entrada': true, 'stop-fijo': false, 'salida-plan': true, 'registro-dia': true } }))
    expect(answered).toContain('4 de 5')
    expect(answered).toContain('moviste el stop')
  })
})
