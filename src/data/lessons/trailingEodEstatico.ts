import type { LessonContent } from '../lessonTypes'

export const trailingEodEstatico: LessonContent = {
  objective: [
    'Explicar con un ejemplo cómo se mueve el piso de tu ',
    { term: 'drawdown' },
    ' en cada tipo de cuenta, y detectar cuál te deja menos margen.',
  ],
  blocks: [
    {
      type: 'paragraph',
      content: [
        'Imagina una cuenta de 50,000 con un drawdown de 2,000. Al inicio, tu piso está en 48,000: si el saldo baja de ahí, pierdes la cuenta. Lo que cambia entre tipos es ',
        { strong: 'cuándo sube ese piso' },
        '.',
      ],
    },
    {
      type: 'figure',
      figure: 'drawdown-floors',
      caption:
        'Ejemplo ilustrativo. Los pisos trailing se bloquean en el saldo inicial en este modelo (como en algunas firmas); otras no lo hacen. Revisa las reglas de tu plan.',
    },
    {
      type: 'definitions',
      items: [
        {
          title: 'Trailing intradía',
          swatch: 'solid',
          content: [
            'El piso sigue tu máximo en tiempo real, con ganancias abiertas incluidas. Si un trade llega a +1,500 y lo cierras en +400, el piso igual subió 1,500. Es el tipo con menos margen.',
          ],
        },
        {
          title: 'Trailing EOD (cierre del día)',
          swatch: 'dashed',
          content: [
            'El piso solo sube con tu saldo al cierre. Las oscilaciones dentro de la sesión no cuentan, así que tolera mejor el ruido intradía.',
          ],
        },
        {
          title: 'Estático',
          swatch: 'dotted',
          content: ['El piso no se mueve. Cada ganancia es un colchón más grande. Es el más fácil de gestionar.'],
        },
      ],
    },
    {
      type: 'practice',
      title: 'Simula tu drawdown con tus propios trades',
      description:
        'Corre el simulador con un plan trailing y otro estático y compara cuántas evaluaciones sobreviven.',
      actions: [{ label: 'Abrir el simulador de fondeo', to: '/simulador', soon: true }],
    },
  ],
}
