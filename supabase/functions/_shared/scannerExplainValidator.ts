// explain-scan-result — reutiliza resolveFieldPath y RECOMMENDATION_DENYLIST_PATTERNS
// de responseValidator.ts, mismo mecanismo anti-alucinación que ya usan
// analyze-trade/generate-insights, aplicado acá a los indicadores de un símbolo.
import { z } from 'npm:zod@3'
import { resolveFieldPath, RECOMMENDATION_DENYLIST_PATTERNS } from './responseValidator.ts'
import type { ScannerExplainContext } from './scannerExplainPrompt.ts'

const factCitedSchema = z.object({ field_path: z.string().min(1), value: z.string() })

export const scannerExplainResponseSchema = z.object({
  explanation: z.string().min(1),
  facts_cited: z.array(factCitedSchema),
})

export interface ScannerExplainValidationResult {
  valid: boolean
  reason?: string
  explanation?: string
  facts_cited?: Array<{ field_path: string; value: string }>
}

export function validateScannerExplainResponse(rawText: string, context: ScannerExplainContext): ScannerExplainValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = scannerExplainResponseSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  if (result.data.facts_cited.length === 0) {
    return { valid: false, reason: 'La respuesta no cita ningún dato de respaldo.' }
  }
  for (const fact of result.data.facts_cited) {
    if (resolveFieldPath(context, fact.field_path) === undefined) {
      return { valid: false, reason: `facts_cited cita un campo inexistente: "${fact.field_path}".` }
    }
  }
  if (RECOMMENDATION_DENYLIST_PATTERNS.some((pattern) => pattern.test(result.data.explanation))) {
    return { valid: false, reason: 'La respuesta contiene lenguaje de recomendación financiera, lo cual está prohibido.' }
  }

  return { valid: true, explanation: result.data.explanation, facts_cited: result.data.facts_cited }
}
