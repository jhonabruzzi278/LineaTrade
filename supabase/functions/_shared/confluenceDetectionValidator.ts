// detect-confluences — valida la salida del modelo antes de devolverla al cliente.
// Dos capas, igual que responseValidator.ts (analyze-trade) pero simplificado para este
// caso: (1) forma — JSON válido + schema correcto; (2) fundamento — cada "key" que la
// IA devuelve tiene que existir en la lista de candidatos que se le mandó. Una "key"
// inventada es exactamente el tipo de alucinación que facts_cited previene en
// analyze-trade, aplicado acá a identificadores en vez de a números de contexto.
import { z } from 'npm:zod@3'

export const confluenceEvaluationSchema = z.object({
  evaluations: z.array(
    z.object({
      key: z.string(),
      keep: z.boolean(),
      confidence: z.number().min(0).max(1),
      note: z.string(),
    }),
  ),
})

export type ConfluenceEvaluation = z.infer<typeof confluenceEvaluationSchema>['evaluations'][number]

export interface ConfluenceDetectionValidationResult {
  valid: boolean
  reason?: string
  evaluations?: ConfluenceEvaluation[]
}

export function validateConfluenceDetectionResponse(
  rawText: string,
  validKeys: ReadonlySet<string>,
): ConfluenceDetectionValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = confluenceEvaluationSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  // Filtra en vez de rechazar todo el batch — una sola key inventada entre 20
  // evaluaciones reales no debería tirar toda la respuesta, mismo espíritu que
  // findUncitedSignificantNumber en responseValidator.ts (descarta lo no fundamentado,
  // no todo el análisis).
  const grounded = result.data.evaluations.filter((evaluation) => validKeys.has(evaluation.key))
  return { valid: true, evaluations: grounded }
}
