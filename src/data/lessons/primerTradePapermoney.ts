import type { LessonContent } from '../lessonTypes'

export const primerTradePapermoney: LessonContent = {
  objective: [
    'Ejecutar un trade completo en una cuenta demo, con el plan escrito antes de entrar, y registrarlo en tu journal sin mezclarlo con tus estadísticas reales.',
  ],
  blocks: [
    {
      type: 'paragraph',
      content: [
        'Una cuenta de ',
        { term: 'papermoney' },
        ' usa precios reales con dinero ficticio. No sirve para ganar: sirve para ensayar el proceso completo —plan, orden, registro y revisión— cuando equivocarte no cuesta nada.',
      ],
    },
    {
      type: 'callout',
      content: [
        { strong: 'Lo que la demo no te enseña.' },
        ' No reproduce el nudo en el estómago de arriesgar dinero real ni los deslizamientos de precio en mercados rápidos. Úsala para la mecánica, no para medir tu talento.',
      ],
    },
    {
      type: 'steps',
      steps: [
        {
          id: 'cuenta-demo',
          practiceLabel: 'Cuenta demo abierta',
          title: 'Abre tu cuenta demo',
          content: [
            'Usa el simulador de tu bróker o el modo de práctica de tu plataforma de gráficos. Elige un saldo parecido al que usarías de verdad: practicar con 1,000,000 te enseña hábitos que no existen.',
          ],
        },
        {
          id: 'plan',
          practiceLabel: 'Plan escrito',
          title: 'Escribe tu plan antes de entrar',
          widget: 'position-size',
          content: [
            'Un plan es cinco datos: instrumento, dirección, entrada, stop y objetivo. Con eso calculas cuánto comprar para que perder te cueste exactamente ',
            { strong: '1R' },
            ', el riesgo que decidiste aceptar.',
          ],
        },
        {
          id: 'ejecucion',
          practiceLabel: 'Trade ejecutado',
          title: 'Ejecuta con el stop y el objetivo ya puestos',
          content: [
            'Si tu plataforma ofrece una orden bracket (entrada, stop y objetivo en una sola), úsala. Después de enviarla, no muevas el stop.',
          ],
          chips: ['Una sola entrada', 'Stop fijo', 'Sin perseguir el precio'],
        },
        {
          id: 'registro',
          practiceLabel: 'Registrado como práctica',
          title: 'Regístralo en tu journal como práctica',
          content: [
            'Regístralo en Nuevo trade indicando que es una operación de práctica. Queda guardado con la etiqueta ',
            { tag: 'PRÁCTICA' },
            ' y ',
            { strong: 'no cuenta' },
            ' en tu reporte ni en tus estadísticas reales.',
          ],
        },
        {
          id: 'revision',
          practiceLabel: 'Proceso revisado',
          title: 'Revisa el proceso, no el resultado',
          widget: 'process-review',
          content: [
            'Cuando cierres el trade, responde cinco preguntas sobre cómo ejecutaste. Un trade perdedor que siguió el plan es un buen trade; uno ganador que lo rompió, no.',
          ],
        },
      ],
    },
    {
      type: 'practice',
      title: 'Haz tu primer trade demo hoy',
      description:
        'Registra el trade en tu journal y vuelve aquí para marcar tus pasos: se guardan en este dispositivo.',
      actions: [
        { label: 'Registrar trade demo', to: '/nuevo-trade', variant: 'primary' },
        { label: 'Ir a la revisión', to: '#paso-revision', variant: 'secondary' },
      ],
    },
  ],
}

/** Preguntas de la revisión del proceso (paso 5). Todas se responden Sí/No. */
export const PROCESS_REVIEW_QUESTIONS = [
  { id: 'plan-previo', text: '¿Escribí el plan antes de entrar?', ariaLabel: 'Plan escrito antes de entrar', flaw: 'entraste sin el plan escrito' },
  { id: 'precio-entrada', text: '¿Entré en el precio que dije?', ariaLabel: 'Entrada en el precio del plan', flaw: 'entraste en un precio distinto al del plan' },
  { id: 'stop-fijo', text: '¿Dejé el stop donde estaba?', ariaLabel: 'Stop sin mover', flaw: 'moviste el stop' },
  { id: 'salida-plan', text: '¿Salí por el stop o el objetivo, no por ansiedad?', ariaLabel: 'Salida por stop u objetivo', flaw: 'saliste por una razón distinta al stop o al objetivo' },
  { id: 'registro-dia', text: '¿Lo registré el mismo día?', ariaLabel: 'Registro el mismo día', flaw: 'no lo registraste el mismo día' },
] as const

export type ProcessReviewQuestionId = (typeof PROCESS_REVIEW_QUESTIONS)[number]['id']
