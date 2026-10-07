// Modelo de contenido de una lección: datos tipados, no JSX. Cada lección se
// escribe como una lista de bloques; las pantallas deciden cómo dibujarlos.

/** Fragmento de texto en línea. Un string suelto es texto normal. */
export type RichSegment =
  | string
  | { strong: string }
  /** Término del glosario: se dibuja subrayado con su definición. */
  | { term: string; label?: string }
  /** Etiqueta inline (p. ej. PRÁCTICA). */
  | { tag: string }

export type Rich = readonly RichSegment[]

/** Estilo de trazo que identifica un tipo en un gráfico (no depende solo del color). */
export type LineStyle = 'solid' | 'dashed' | 'dotted'

export interface DefinitionItem {
  title: string
  content: Rich
  /** Muestra de trazo, igual que en la leyenda de la figura. */
  swatch?: LineStyle
}

/** Figuras interactivas o ilustraciones disponibles (se resuelven en `LessonFigure`). */
export type LessonFigureId = 'drawdown-floors'

/** Widgets interactivos que puede alojar un paso. */
export type StepWidgetId = 'position-size' | 'process-review'

export interface PracticeAction {
  label: string
  to: string
  variant?: 'primary' | 'secondary'
  /** La pantalla destino aún no existe: se muestra deshabilitada. */
  soon?: boolean
}

export type LessonBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; content: Rich }
  | { type: 'callout'; content: Rich }
  | { type: 'figure'; figure: LessonFigureId; caption: string }
  | { type: 'definitions'; items: readonly DefinitionItem[] }
  | { type: 'steps'; steps: readonly LessonStep[] }
  | { type: 'practice'; title: string; description: string; actions?: readonly PracticeAction[] }

export interface LessonStep {
  id: string
  title: string
  content: Rich
  /** Etiquetas cortas bajo el texto (p. ej. «Stop fijo»). */
  chips?: readonly string[]
  widget?: StepWidgetId
  /** Nombre del paso en el panel «Tu práctica». */
  practiceLabel: string
}

export interface LessonContent {
  /** «Lo que vas a poder hacer». */
  objective: Rich
  blocks: readonly LessonBlock[]
}
