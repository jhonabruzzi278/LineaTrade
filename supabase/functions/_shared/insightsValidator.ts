// Fase 4 (Insights cross-trade) — valida la salida del modelo antes de persistirla.
// Reutiliza resolveFieldPath y RECOMMENDATION_DENYLIST_PATTERNS de
// responseValidator.ts tal cual (mismo mecanismo de "alucinación detectable
// programáticamente" que ya usa analyze-trade), en vez de reimplementar la
// validación anti-alucinación desde cero para este caso.
import { z } from 'npm:zod@3'
import { resolveFieldPath, RECOMMENDATION_DENYLIST_PATTERNS } from './responseValidator.ts'
import type { InsightsContext } from './insightsContext.ts'

const factCitedSchema = z.object({
  field_path: z.string().min(1),
  value: z.string(),
})

export const insightsResponseSchema = z.object({
  insights: z
    .array(
      z.object({
        text: z.string().min(1),
        facts_cited: z.array(factCitedSchema),
      }),
    )
    .max(10),
})

export type Insight = z.infer<typeof insightsResponseSchema>['insights'][number]

export interface InsightsValidationResult {
  valid: boolean
  reason?: string
  insights?: Insight[]
}

export function validateInsightsResponse(rawText: string, context: InsightsContext): InsightsValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = insightsResponseSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  // Un insight se descarta ENTERO si le falta fundamento (sin facts_cited, o con un
  // field_path que no resuelve, o con lenguaje de recomendación financiera) — no se
  // "arregla" parcialmente, mismo criterio binario que analyze-trade aplica al
  // análisis completo.
  const grounded = result.data.insights.filter((insight) => {
    if (insight.facts_cited.length === 0) return false
    const allResolve = insight.facts_cited.every((fact) => resolveFieldPath(context, fact.field_path) !== undefined)
    if (!allResolve) return false
    return !RECOMMENDATION_DENYLIST_PATTERNS.some((pattern) => pattern.test(insight.text))
  })

  return { valid: true, insights: grounded }
}
