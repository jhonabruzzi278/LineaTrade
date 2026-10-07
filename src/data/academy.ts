export type AcademyLesson = {
  id: string
  title: string
  durationMinutes: number
  practice?: string
  summary: string
  objective: string
  keyPoints: string[]
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
      { id: 'bienvenida', title: 'Bienvenido a LineaTrade', durationMinutes: 6, summary: 'Un journal sirve para hacer visible el proceso detrás de cada decisión.', objective: 'Separar calidad de decisión y resultado financiero.', keyPoints: ['Registra contexto, plan y ejecución antes de evaluar el desenlace.', 'Una operación rentable puede romper tus reglas; una pérdida puede respetarlas.', 'Busca muestras de operaciones para revisar patrones, no conclusiones por un solo trade.'] },
      { id: 'futuros-indices', title: 'NQ, MNQ, ES y MES', durationMinutes: 10, summary: 'NQ y ES son contratos de futuros sobre índices; MNQ y MES son sus versiones micro.', objective: 'Distinguir los símbolos y reconocer que el tamaño del contrato cambia la exposición.', keyPoints: ['NQ sigue el Nasdaq-100 y ES el S&P 500.', 'MNQ y MES representan una fracción del tamaño de sus contratos estándar.', 'Verifica especificaciones, tick y valor monetario en la bolsa y en tu broker antes de operar.'] },
      { id: 'riesgo-r', title: 'Riesgo y resultado en R', durationMinutes: 11, practice: 'Define tu riesgo base', summary: 'R expresa ganancias o pérdidas en relación con el riesgo inicial planificado.', objective: 'Calcular R usando una unidad de riesgo consistente.', keyPoints: ['Si arriesgaste 100 y el resultado fue 150, el resultado es +1,5R.', 'Define si comisiones y deslizamiento se incluyen y mantén ese criterio.', 'R permite comparar operaciones con tamaños de posición distintos.'] },
      { id: 'sesiones', title: 'Sesiones y ventanas operativas', durationMinutes: 9, summary: 'La actividad y liquidez cambian a lo largo del día y alrededor de eventos económicos.', objective: 'Planificar ventanas de observación según tu mercado y horario local.', keyPoints: ['Confirma el horario oficial y los cambios por horario de verano.', 'Una ventana es un contexto para observar, no una señal de entrada.', 'Evita operar durante eventos si tu plan no define cómo gestionarlos.'] },
      { id: 'disciplina', title: 'Proceso antes que resultado', durationMinutes: 10, practice: 'Crea tu primera regla', summary: 'Un proceso repetible permite revisar decisiones con criterios claros.', objective: 'Escribir una regla observable que puedas evaluar después.', keyPoints: ['Describe qué debe ocurrir antes de entrar.', 'Incluye una condición que invalide la idea.', 'Evalúa cumplimiento por separado del P&L.'] },
    ],
  },
  {
    id: 'mesa-trabajo',
    number: '02',
    title: 'Prepara tu mesa de trabajo',
    description: 'Configura gráficos, calendario, horarios y una rutina pre-market repetible.',
    durationMinutes: 48,
    lessons: [
      { id: 'workspace', title: 'Un workspace sin ruido', durationMinutes: 8, summary: 'Una mesa de trabajo consistente reduce distracciones y cambios impulsivos.', objective: 'Organizar las herramientas que necesitas antes de la sesión.', keyPoints: ['Mantén visibles solo gráficos, calendario y journal necesarios.', 'Guarda una plantilla y evita cambiarla durante la operación.', 'Prueba el flujo en simulación antes de depender de él.'] },
      { id: 'contratos', title: 'Contratos y rollover', durationMinutes: 10, summary: 'Los futuros tienen vencimientos y la liquidez puede migrar al siguiente contrato.', objective: 'Saber dónde confirmar el contrato activo y sus fechas.', keyPoints: ['Consulta el calendario oficial de vencimientos.', 'El volumen puede trasladarse gradualmente entre contratos.', 'Ajusta gráficos y símbolos según las especificaciones de tu plataforma.'] },
      { id: 'calendario', title: 'Calendario económico', durationMinutes: 9, practice: 'Marca una ventana de noticias', summary: 'Los datos macroeconómicos pueden cambiar volatilidad y ejecución.', objective: 'Identificar eventos relevantes y documentar tu plan para ellos.', keyPoints: ['Confirma la hora y zona horaria en una fuente actualizada.', 'Define si observarás, reducirás exposición o no participarás.', 'No asumas que una reacción pasada predice la siguiente.'] },
      { id: 'niveles', title: 'Niveles de referencia', durationMinutes: 11, summary: 'Los niveles ayudan a describir ubicación y contexto del precio.', objective: 'Marcar referencias con una regla estable y evitar saturar el gráfico.', keyPoints: ['Documenta cómo calculas cada nivel.', 'Separa nivel observado de hipótesis operativa.', 'Revisa si el nivel aportó información en una muestra amplia.'] },
      { id: 'rutina', title: 'Tu rutina pre-market', durationMinutes: 10, practice: 'Completa una sesión', summary: 'Una rutina breve convierte la preparación en pasos verificables.', objective: 'Crear una lista previa que puedas completar sin improvisar.', keyPoints: ['Revisa calendario, condiciones personales y límites de riesgo.', 'Escribe escenarios e invalidaciones antes de la sesión.', 'Si una condición esencial falla, reduce actividad o no operes.'] },
    ],
  },
  {
    id: 'estructura',
    number: '03',
    title: 'Estructura del mercado',
    description: 'Contexto mensual, semanal y diario antes de buscar una ejecución.',
    durationMinutes: 61,
    lessons: [
      { id: 'estructura-base', title: 'Estructura y desplazamiento', durationMinutes: 10, summary: 'La estructura describe secuencias observables de máximos, mínimos y rangos.', objective: 'Describir el movimiento sin convertir una etiqueta en predicción.', keyPoints: ['Anota la temporalidad y el tramo que estás observando.', 'Distingue impulso, retroceso y rango con criterios definidos.', 'La estructura puede cambiar; documenta qué invalidaría tu lectura.'] },
      { id: 'bias-htf', title: 'Bias de temporalidad alta', durationMinutes: 11, practice: 'Registra tres contextos', summary: 'El contexto de una temporalidad amplia puede enmarcar una hipótesis de corto plazo.', objective: 'Escribir escenarios alternativos en vez de aferrarte a una dirección.', keyPoints: ['Define qué marco temporal estás usando.', 'Incluye un escenario alcista, bajista o neutral cuando aplique.', 'La lectura amplia no garantiza el siguiente movimiento.'] },
      { id: 'pdh-pdl', title: 'PDH, PDL, PWH y PWL', durationMinutes: 10, summary: 'Son abreviaturas comunes para máximos y mínimos del día o semana previos.', objective: 'Calcular referencias previas con una zona horaria constante.', keyPoints: ['PDH/PDL: máximo y mínimo del día anterior.', 'PWH/PWL: máximo y mínimo de la semana anterior.', 'Las sesiones y zonas horarias pueden cambiar cómo se define el periodo.'] },
      { id: 'sesion-asia', title: 'Asia y Londres', durationMinutes: 9, summary: 'Los nombres de sesión describen ventanas horarias y centros de actividad.', objective: 'Registrar ventanas en tu zona horaria sin tratarlas como reglas universales.', keyPoints: ['Define hora de inicio y fin para tu método.', 'Considera cambios estacionales de horario.', 'Compara resultados por ventana antes de generalizar.'] },
      { id: 'narrativa', title: 'Construir una narrativa', durationMinutes: 11, summary: 'Una narrativa conecta contexto, niveles y escenarios en una explicación comprobable.', objective: 'Formular una hipótesis con condición de invalidación.', keyPoints: ['Describe qué observaste, no solo lo que esperas.', 'Escribe qué evidencia confirmaría o debilitaría la hipótesis.', 'Registra alternativas para reducir el sesgo retrospectivo.'] },
      { id: 'review-estructura', title: 'Práctica de contexto', durationMinutes: 10, practice: 'Analiza cinco sesiones', summary: 'Revisar varios ejemplos permite comprobar si tus definiciones son consistentes.', objective: 'Aplicar la misma plantilla de contexto a sesiones distintas.', keyPoints: ['Usa datos de distintas condiciones de mercado.', 'Registra excepciones junto con los ejemplos que encajan.', 'No cambies la definición después de ver cada resultado.'] },
    ],
  },
  {
    id: 'liquidez',
    number: '04',
    title: 'Liquidez y zonas',
    description: 'Identifica zonas como evidencia; nunca como una señal automática.',
    durationMinutes: 57,
    lessons: [
      { id: 'liquidez-base', title: 'Dónde descansa la liquidez', durationMinutes: 11, summary: 'La liquidez es la capacidad de negociar sin mover demasiado el precio; en análisis técnico se usa también como hipótesis sobre órdenes.', objective: 'Separar el concepto de mercado de las interpretaciones visuales del gráfico.', keyPoints: ['Los niveles visibles no muestran todas las órdenes existentes.', 'Trata las zonas como hipótesis que requieren observación.', 'Evita afirmar que conoces la ubicación exacta de órdenes de terceros.'] },
      { id: 'sweeps', title: 'Sweeps e invalidación', durationMinutes: 12, summary: '“Sweep” suele describir una excursión más allá de un nivel seguida por un retorno, según la definición de cada operador.', objective: 'Definir el patrón con reglas y registrar también los casos que no revierten.', keyPoints: ['Especifica cuánto debe exceder el nivel y en qué marco temporal.', 'Un retorno no prueba por sí solo una intención institucional.', 'Define invalidación antes de revisar el desenlace.'] },
      { id: 'fvg', title: 'Fair Value Gaps', durationMinutes: 12, practice: 'Registra veinte ejemplos', summary: 'FVG es un patrón de tres velas que algunos operadores interpretan como una zona de desplazamiento rápido.', objective: 'Aplicar una definición consistente y revisar su desempeño sin sesgo.', keyPoints: ['Documenta exactamente qué velas delimitan el patrón.', 'No toda zona se rellena ni toda reacción es operable.', 'Registra fallos y condiciones junto con los ejemplos favorables.'] },
      { id: 'order-blocks', title: 'Order Blocks y breakers', durationMinutes: 12, summary: 'Son etiquetas de análisis discrecional para zonas asociadas a movimientos posteriores.', objective: 'Describir las reglas de marcado de forma que otro lector pueda repetirlas.', keyPoints: ['No hay una definición única compartida por todos los operadores.', 'Anota el criterio de selección y temporalidad.', 'Valida con datos y conserva los ejemplos que contradicen la hipótesis.'] },
      { id: 'confluencia', title: 'Confluencia con contexto', durationMinutes: 10, practice: 'Compara zonas en tu journal', summary: 'La confluencia combina evidencias independientes dentro de un plan.', objective: 'Evitar contar varias veces la misma señal con nombres distintos.', keyPoints: ['Define cada evidencia por separado.', 'Más etiquetas no implican mayor probabilidad automáticamente.', 'Registra resultados para comprobar el valor incremental de cada factor.'] },
    ],
  },
  {
    id: 'ejecucion',
    number: '05',
    title: 'Ejecución y revisión',
    description: 'Convierte condiciones en un setup medible y revisa la calidad de la decisión.',
    durationMinutes: 62,
    lessons: [
      { id: 'setup', title: 'Anatomía de un setup', durationMinutes: 10, summary: 'Un setup traduce contexto y condiciones en una decisión repetible.', objective: 'Especificar las partes de una hipótesis operativa antes de ejecutarla.', keyPoints: ['Define contexto, gatillo, invalidación y gestión.', 'Incluye condiciones para no operar.', 'Comprueba cada elemento con ejemplos históricos y en vivo.'] },
      { id: 'compliance', title: 'Strategy Compliance', durationMinutes: 9, practice: 'Configura un modelo', summary: 'El cumplimiento compara la operación tomada con las reglas que estaban escritas previamente.', objective: 'Crear criterios observables y evitar juzgar una regla después del resultado.', keyPoints: ['Usa reglas concretas que puedan marcarse sí/no.', 'Distingue error de ejecución de una pérdida prevista.', 'Revisa cambios de reglas por versión.'] },
      { id: 'entry-stop', title: 'Entrada, stop y objetivo', durationMinutes: 11, summary: 'La entrada, el punto de invalidación y el objetivo definen exposición y escenarios.', objective: 'Calcular el riesgo de la idea antes de enviar la orden.', keyPoints: ['Confirma tamaño, tick value y distancia del stop en tu plataforma.', 'Un stop puede ejecutarse a otro precio en mercados rápidos.', 'El objetivo es una hipótesis, no una garantía de salida.'] },
      { id: 'gestion', title: 'Gestión sin improvisación', durationMinutes: 10, summary: 'La gestión define cómo actuar ante cambios una vez abierta la posición.', objective: 'Escribir por adelantado qué decisiones están permitidas durante la operación.', keyPoints: ['Define condiciones para reducir, salir o mantener.', 'No muevas el stop para esconder que el riesgo cambió.', 'Registra cualquier intervención y su motivo.'] },
      { id: 'journal-review', title: 'Journal y review', durationMinutes: 10, practice: 'Documenta cinco trades', summary: 'Un journal facilita comparar plan, ejecución y resultado con datos consistentes.', objective: 'Registrar operaciones con campos suficientes para una revisión posterior.', keyPoints: ['Captura contexto y plan antes de que la memoria los altere.', 'Usa etiquetas estables para filtrar muestras.', 'Busca patrones repetidos y expresa la incertidumbre de muestras pequeñas.'] },
      { id: 'discipline-score', title: 'Tu Discipline Score', durationMinutes: 12, practice: 'Revisa tus desviaciones', summary: 'Una puntuación de disciplina resume cumplimiento según criterios definidos por ti.', objective: 'Interpretar una métrica como instrumento de revisión, no como juicio personal.', keyPoints: ['Comprueba qué reglas y pesos forman el cálculo.', 'Una cifra depende de la calidad de los datos ingresados.', 'Usa las desviaciones para diseñar cambios concretos.'] },
    ],
  },
  {
    id: 'cuenta-evaluada',
    number: '06',
    title: 'Cuenta evaluada y reglas',
    description: 'Lee límites y condiciones de una evaluación sin asumir que todas las firmas operan igual.',
    durationMinutes: 31,
    lessons: [
      { id: 'reglas-evaluacion', title: 'Lee las reglas antes de empezar', durationMinutes: 9, summary: 'Una evaluación define condiciones propias sobre objetivos, límites, actividad y retiro.', objective: 'Convertir las reglas publicadas por tu proveedor en una lista que puedas verificar.', keyPoints: ['Guarda la versión y fecha de las condiciones que aceptaste.', 'Distingue saldo, equity y balance usado para cada cálculo.', 'Consulta directamente al proveedor si una condición no está clara.'] },
      { id: 'drawdown', title: 'Drawdown estático y trailing', durationMinutes: 11, practice: 'Compara ambos métodos con cifras ficticias', summary: 'El drawdown expresa una caída máxima permitida; el punto de referencia puede ser fijo o moverse según las reglas.', objective: 'Identificar cómo se calcula el límite sin extrapolar la regla de una firma a otra.', keyPoints: ['Confirma si el cálculo usa saldo o equity en tiempo real.', 'Verifica cuándo se mueve un trailing threshold y si deja de moverse.', 'Las diferencias de cálculo pueden cambiar el límite efectivo disponible.'] },
      { id: 'limites-fondeo', title: 'Pérdida diaria y condiciones', durationMinutes: 11, practice: 'Resume los límites de una cuenta que ya tengas', summary: 'Algunas evaluaciones definen límites diarios, días de actividad u otras condiciones de consistencia.', objective: 'Registrar cada condición operativa y su método de cómputo.', keyPoints: ['Comprueba qué zona horaria marca el reinicio diario.', 'Revisa si comisiones y posiciones abiertas cuentan en el cálculo.', 'Las condiciones y programas cambian: usa siempre la documentación vigente.'] },
    ],
  },
]

export const academyLessons = academyModules.flatMap((module) =>
  module.lessons.map((lesson) => ({ ...lesson, moduleId: module.id, moduleTitle: module.title })),
)

export type GlossaryEntry = { term: string; definition: string; category: string }

export const academyGlossary: GlossaryEntry[] = [
  { term: 'Bias', category: 'Contexto', definition: 'Hipótesis direccional o neutral basada en un contexto definido. No predice ni garantiza el movimiento siguiente.' },
  { term: 'Breaker', category: 'Estructura', definition: 'Zona que algunos métodos identifican cuando una estructura previamente marcada deja de sostenerse y cambia de función.' },
  { term: 'Drawdown', category: 'Riesgo', definition: 'Caída desde un máximo previo de capital o equity hasta un punto posterior. Especifica si se mide cerrado o incluyendo posiciones abiertas.' },
  { term: 'Drawdown estático', category: 'Riesgo', definition: 'Límite de pérdida que se calcula desde una referencia fija, según la definición del proveedor o del plan.' },
  { term: 'FVG', category: 'Zonas', definition: 'Fair Value Gap: patrón de tres velas usado por algunos métodos para marcar un tramo con poco solapamiento entre velas.' },
  { term: 'Invalidación', category: 'Plan', definition: 'Condición definida previamente que indica que la hipótesis ya no aplica.' },
  { term: 'MNQ / MES', category: 'Contratos', definition: 'Contratos Micro E-mini sobre Nasdaq-100 y S&P 500. Revisa las especificaciones vigentes del exchange antes de operar.' },
  { term: 'Order Block', category: 'Zonas', definition: 'Etiqueta discrecional para una zona del gráfico; los criterios exactos varían entre métodos.' },
  { term: 'PDH / PDL', category: 'Niveles', definition: 'Previous Day High / Low: máximo y mínimo del día previo, según la sesión y zona horaria que definas.' },
  { term: 'PWH / PWL', category: 'Niveles', definition: 'Previous Week High / Low: máximo y mínimo de la semana previa, según la sesión y zona horaria que definas.' },
  { term: 'R', category: 'Riesgo', definition: 'Unidad que expresa el resultado relativo al riesgo inicial planificado. +2R equivale a ganar dos veces esa unidad.' },
  { term: 'Rollover', category: 'Contratos', definition: 'Transición de actividad desde un contrato de futuros próximo a vencer hacia otro vencimiento.' },
  { term: 'Sweep', category: 'Liquidez', definition: 'Término usado para una excursión del precio más allá de un nivel; define siempre el patrón y la confirmación de tu método.' },
  { term: 'Tick', category: 'Contratos', definition: 'Incremento mínimo de cotización de un contrato. Su valor monetario depende de las especificaciones del producto.' },
  { term: 'Trailing drawdown', category: 'Riesgo', definition: 'Límite que puede seguir un máximo de balance o equity según reglas específicas. Confirma cómo, cuándo y dónde se actualiza.' },
  { term: 'Pérdida diaria', category: 'Riesgo', definition: 'Límite de pérdida calculado dentro de un periodo diario definido. La hora de reinicio y los componentes incluidos varían por proveedor.' },
]

export const academyTotalMinutes = academyModules.reduce((total, module) => total + module.durationMinutes, 0)

export function formatAcademyDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return hours ? `${hours} h ${remainder.toString().padStart(2, '0')} min` : `${minutes} min`
}
