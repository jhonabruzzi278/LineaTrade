// ai-coach-chat — reutiliza resolveFieldPath y RECOMMENDATION_DENYLIST_PATTERNS de
// responseValidator.ts, mismo mecanismo anti-alucinación que el resto del motor de IA
// (analyze-trade/generate-insights/detect-confluences/explain-scan-result). A
// diferencia de esos, "facts_cited" puede quedar vacío acá (un turno de chat que no
// cita ningún número, ej. un saludo, es válido) — solo se exige que, SI hay
// facts_cited, cada uno resuelva de verdad.
import { z } from 'npm:zod@3'
import { resolveFieldPath, RECOMMENDATION_DENYLIST_PATTERNS } from './responseValidator.ts'
import type { InsightsContext } from './insightsContext.ts'

const factCitedSchema = z.object({ field_path: z.string().min(1), value: z.string() })

export const coachResponseSchema = z.object({
  content: z.string().min(1),
  facts_cited: z.array(factCitedSchema),
})

export interface CoachValidationResult {
  valid: boolean
  reason?: string
  content?: string
  facts_cited?: Array<{ field_path: string; value: string }>
}

export function validateCoachResponse(rawText: string, context: InsightsContext): CoachValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = coachResponseSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  for (const fact of result.data.facts_cited) {
    if (resolveFieldPath(context, fact.field_path) === undefined) {
      return { valid: false, reason: `facts_cited cita un campo inexistente: "${fact.field_path}".` }
    }
  }
  if (RECOMMENDATION_DENYLIST_PATTERNS.some((pattern) => pattern.test(result.data.content))) {
    return { valid: false, reason: 'La respuesta contiene lenguaje de recomendación financiera, lo cual está prohibido.' }
  }

  return { valid: true, content: result.data.content, facts_cited: result.data.facts_cited }
}
