import type { LessonContent } from './lessonTypes'
import { primerTradePapermoney } from './lessons/primerTradePapermoney'
import { trailingEodEstatico } from './lessons/trailingEodEstatico'

// Lecciones con contenido real, por ID. Las que no están aquí muestran el
// estado «contenido en preparación»: para escribir una, basta con añadir su
// entrada (y, si usa figuras o widgets nuevos, registrarlos en lessonTypes).
export const lessonContent: Readonly<Record<string, LessonContent | undefined>> = {
  'trailing-eod-estatico': trailingEodEstatico,
  'primer-trade-papermoney': primerTradePapermoney,
}
