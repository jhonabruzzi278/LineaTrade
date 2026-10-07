export type GlossaryCategory = 'riesgo' | 'fondeo' | 'resultados' | 'mercado'

export interface GlossaryTerm {
  id: string
  term: string
  category: GlossaryCategory
  definition: string
  /** Lección de la Academia donde se explica con más detalle. */
  lessonId?: string
}

export const GLOSSARY_CATEGORY_LABEL: Record<GlossaryCategory, string> = {
  riesgo: 'Riesgo',
  fondeo: 'Fondeo',
  resultados: 'Resultados',
  mercado: 'Mercado',
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = ['riesgo', 'fondeo', 'resultados', 'mercado']

export const glossaryTerms: GlossaryTerm[] = [
  {
    id: 'drawdown',
    term: 'Drawdown',
    category: 'riesgo',
    definition:
      'La caída desde el punto más alto de tu cuenta hasta un punto más bajo. En una evaluación de fondeo, es el monto máximo que puedes perder antes de que la firma cierre la cuenta.',
    lessonId: 'que-es-drawdown',
  },
  {
    id: 'drawdown-trailing-intradia',
    term: 'Drawdown trailing intradía',
    category: 'fondeo',
    definition:
      'El piso de pérdida sube siguiendo el máximo de tu saldo en tiempo real, incluso con ganancias abiertas, y nunca baja. Si una ganancia abierta se devuelve, el piso ya subió.',
    lessonId: 'trailing-eod-estatico',
  },
  {
    id: 'drawdown-trailing-eod',
    term: 'Drawdown trailing EOD',
    category: 'fondeo',
    definition:
      'Igual que el trailing, pero el piso solo sube con tu saldo al cierre del día (EOD, end of day). Las subidas y bajadas dentro de la sesión no cuentan.',
    lessonId: 'trailing-eod-estatico',
  },
  {
    id: 'drawdown-estatico',
    term: 'Drawdown estático',
    category: 'fondeo',
    definition:
      'El piso queda fijo, o deja de subir al llegar a un nivel (por ejemplo, tu saldo inicial). Desde ahí, cada ganancia es colchón.',
    lessonId: 'trailing-eod-estatico',
  },
  {
    id: 'limite-perdida-diaria',
    term: 'Límite de pérdida diaria',
    category: 'fondeo',
    definition:
      'La pérdida máxima permitida en un día. Según la firma, pausa tu sesión o cierra la cuenta. Revisa cuál aplica a tu plan.',
    lessonId: 'limite-diario-objetivo',
  },
  {
    id: 'objetivo-ganancia',
    term: 'Objetivo de ganancia (profit target)',
    category: 'fondeo',
    definition:
      'La ganancia que debes alcanzar, respetando las demás reglas, para aprobar una evaluación.',
    lessonId: 'limite-diario-objetivo',
  },
  {
    id: 'regla-consistencia',
    term: 'Regla de consistencia',
    category: 'fondeo',
    definition:
      'Limita qué parte de tu ganancia total puede venir de un solo día; por ejemplo, que ningún día supere el 50 %. No todas las firmas la aplican.',
    lessonId: 'consistencia-dias-minimos',
  },
  {
    id: 'r-multiplo',
    term: 'R (múltiplo de riesgo)',
    category: 'resultados',
    definition:
      'Tu unidad de riesgo. Si arriesgas 200 en un trade, 1R son 200. Ganar 400 es +2R. Permite comparar trades de distinto tamaño.',
    lessonId: 'riesgo-r',
  },
  {
    id: 'expectativa',
    term: 'Expectativa (expected value)',
    category: 'resultados',
    definition:
      'La ganancia promedio que esperas por trade: tu porcentaje de aciertos por la ganancia media, menos tu porcentaje de errores por la pérdida media. Con pocos trades es una estimación débil.',
  },
  {
    id: 'profit-factor',
    term: 'Profit factor',
    category: 'resultados',
    definition:
      'Ganancia bruta dividida entre pérdida bruta. Por encima de 1 ganas más de lo que pierdes. Con una muestra pequeña, un solo trade grande lo distorsiona.',
  },
  {
    id: 'win-rate',
    term: 'Win rate (porcentaje de aciertos)',
    category: 'resultados',
    definition:
      'El porcentaje de trades cerrados que terminaron en ganancia. Por sí solo no dice si una forma de operar es rentable: hay que leerlo junto con el tamaño medio de las ganancias y de las pérdidas.',
  },
  {
    id: 'stop',
    term: 'Stop (stop loss)',
    category: 'riesgo',
    definition:
      'El nivel de precio en el que decides cerrar un trade si va en tu contra. Fija de antemano cuánto estás dispuesto a perder (1R) y es la base para calcular el tamaño de la posición.',
    lessonId: 'entry-stop',
  },
  {
    id: 'tamano-posicion',
    term: 'Tamaño de posición',
    category: 'riesgo',
    definition:
      'La cantidad de unidades (acciones, contratos, lotes) que compras o vendes en un trade. Se calcula dividiendo el riesgo en dinero que aceptas entre la distancia al stop.',
    lessonId: 'tamano-posicion',
  },
  {
    id: 'papermoney',
    term: 'Papermoney (cuenta demo)',
    category: 'riesgo',
    definition:
      'Una cuenta de práctica que usa precios reales con dinero ficticio. Sirve para ensayar la mecánica y el proceso; no reproduce la presión de arriesgar dinero real ni todos los deslizamientos de precio.',
    lessonId: 'primer-trade-papermoney',
  },
  {
    id: 'fvg',
    term: 'FVG (Fair Value Gap)',
    category: 'mercado',
    definition:
      'Un hueco de tres velas: el rango de la vela central no queda cubierto por la mecha de la primera ni por la de la tercera. Se estudia como zona de referencia; no es una señal de entrada.',
    lessonId: 'fvg',
  },
  {
    id: 'ob',
    term: 'OB (Order Block)',
    category: 'mercado',
    definition:
      'La última vela contraria antes de un movimiento fuerte con desplazamiento. Se observa como zona donde el precio podría reaccionar; que lo haga no está garantizado.',
    lessonId: 'order-blocks',
  },
  {
    id: 'ob-50',
    term: '50 OB (mitad del Order Block)',
    category: 'mercado',
    definition:
      'El punto medio del Order Block, entre su máximo y su mínimo (algunos usan el cuerpo de la vela). Es una convención de referencia dentro de la zona, no una regla ni una señal.',
    lessonId: 'order-blocks',
  },
]

export const glossaryById: ReadonlyMap<string, GlossaryTerm> = new Map(glossaryTerms.map((term) => [term.id, term]))

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/** Filtra por categoría (o todas) y por texto, sin distinguir tildes ni mayúsculas. */
export function filterGlossary(
  terms: readonly GlossaryTerm[],
  query: string,
  category: GlossaryCategory | 'todo',
): GlossaryTerm[] {
  const needle = normalize(query.trim())
  return terms.filter((item) => {
    if (category !== 'todo' && item.category !== category) return false
    if (!needle) return true
    return normalize(item.term).includes(needle) || normalize(item.definition).includes(needle)
  })
}
