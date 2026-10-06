export type AcademyLesson = {
  id: string
  title: string
  durationMinutes: number
  practice?: string
}

export type AcademyModule = {
  id: string
  number: string
  title: string
  description: string
  durationMinutes: number
  lessons: AcademyLesson[]
}

export const academyModules: AcademyModule[] = [
  {
    id: 'fundamentos',
    number: '01',
    title: 'Fundamentos del proceso',
    description: 'El mercado de futuros, el contrato y las reglas que protegen tu cuenta.',
    durationMinutes: 46,
    lessons: [
      { id: 'bienvenida', title: 'Bienvenido a LineaTrade', durationMinutes: 6 },
      { id: 'futuros-indices', title: 'NQ, MNQ, ES y MES', durationMinutes: 10 },
      { id: 'riesgo-r', title: 'Riesgo y resultado en R', durationMinutes: 11, practice: 'Define tu riesgo base' },
      { id: 'sesiones', title: 'Sesiones y ventanas operativas', durationMinutes: 9 },
      { id: 'disciplina', title: 'Proceso antes que resultado', durationMinutes: 10, practice: 'Crea tu primera regla' },
    ],
  },
  {
    id: 'mesa-trabajo',
    number: '02',
    title: 'Prepara tu mesa de trabajo',
    description: 'Configura gráficos, calendario, horarios y una rutina pre-market repetible.',
    durationMinutes: 48,
    lessons: [
      { id: 'workspace', title: 'Un workspace sin ruido', durationMinutes: 8 },
      { id: 'contratos', title: 'Contratos y rollover', durationMinutes: 10 },
      { id: 'calendario', title: 'Calendario económico', durationMinutes: 9, practice: 'Marca una ventana de noticias' },
      { id: 'niveles', title: 'Niveles de referencia', durationMinutes: 11 },
      { id: 'rutina', title: 'Tu rutina pre-market', durationMinutes: 10, practice: 'Completa una sesión' },
    ],
  },
  {
    id: 'estructura',
    number: '03',
    title: 'Estructura del mercado',
    description: 'Contexto mensual, semanal y diario antes de buscar una ejecución.',
    durationMinutes: 61,
    lessons: [
      { id: 'estructura-base', title: 'Estructura y desplazamiento', durationMinutes: 10 },
      { id: 'bias-htf', title: 'Bias de temporalidad alta', durationMinutes: 11, practice: 'Registra tres contextos' },
      { id: 'pdh-pdl', title: 'PDH, PDL, PWH y PWL', durationMinutes: 10 },
      { id: 'sesion-asia', title: 'Asia y Londres', durationMinutes: 9 },
      { id: 'narrativa', title: 'Construir una narrativa', durationMinutes: 11 },
      { id: 'review-estructura', title: 'Práctica de contexto', durationMinutes: 10, practice: 'Analiza cinco sesiones' },
    ],
  },
  {
    id: 'liquidez',
    number: '04',
    title: 'Liquidez y zonas',
    description: 'Identifica zonas como evidencia; nunca como una señal automática.',
    durationMinutes: 57,
    lessons: [
      { id: 'liquidez-base', title: 'Dónde descansa la liquidez', durationMinutes: 11 },
      { id: 'sweeps', title: 'Sweeps e invalidación', durationMinutes: 12 },
      { id: 'fvg', title: 'Fair Value Gaps', durationMinutes: 12, practice: 'Registra veinte ejemplos' },
      { id: 'order-blocks', title: 'Order Blocks y breakers', durationMinutes: 12 },
      { id: 'confluencia', title: 'Confluencia con contexto', durationMinutes: 10, practice: 'Compara zonas en backtesting' },
    ],
  },
  {
    id: 'ejecucion',
    number: '05',
    title: 'Ejecución y revisión',
    description: 'Convierte condiciones en un setup medible y revisa la calidad de la decisión.',
    durationMinutes: 62,
    lessons: [
      { id: 'setup', title: 'Anatomía de un setup', durationMinutes: 10 },
      { id: 'compliance', title: 'Strategy Compliance', durationMinutes: 9, practice: 'Configura un modelo' },
      { id: 'entry-stop', title: 'Entrada, stop y objetivo', durationMinutes: 11 },
      { id: 'gestion', title: 'Gestión sin improvisación', durationMinutes: 10 },
      { id: 'journal-review', title: 'Journal y review', durationMinutes: 10, practice: 'Documenta cinco trades' },
      { id: 'discipline-score', title: 'Tu Discipline Score', durationMinutes: 12, practice: 'Revisa tus desviaciones' },
    ],
  },
]

export const academyLessons = academyModules.flatMap((module) =>
  module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })),
)

export const academyTotalMinutes = academyModules.reduce((total, module) => total + module.durationMinutes, 0)

export function formatAcademyDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours} h ${remainder.toString().padStart(2, '0')} min` : `${minutes} min`
}
