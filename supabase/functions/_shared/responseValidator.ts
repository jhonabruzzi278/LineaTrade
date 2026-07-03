// Fase 3 (Motor de IA) — valida la salida del LLM antes de persistirla.
// Implementa el mecanismo de "alucinación detectable programáticamente" del
// context-engine doc §6: cada facts_cited[].field_path debe resolver de
// verdad dentro del AIContext que se envió. Si no resuelve, es una cifra
// inventada — se rechaza, nunca se persiste.
import { z } from 'npm:zod@3'
import type { AIContext } from './types.ts'

const factCitedSchema = z.object({
  field_path: z.string().min(1),
  value: z.string(),
})

export const aiAnalysisResponseSchema = z.object({
  data_sufficiency: z.enum(['sufficient', 'limited', 'insufficient']),
  facts_cited: z.array(factCitedSchema),
  interpretation: z.string().min(1),
  observation: z.string().nullable(),
  behavioral_suggestion: z.string().nullable(),
})

export type ParsedAIAnalysisResponse = z.infer<typeof aiAnalysisResponseSchema>

// Denylist básico de lenguaje de recomendación financiera — capa extra sobre
// la instrucción del system prompt, no un reemplazo. Es deliberadamente
// conservador (español, dominio específico) para minimizar falsos positivos
// sobre palabras que además pueden aparecer en contexto legítimo ("evité
// vender por FOMO" no debería dispararlo, así que se buscan patrones de
// recomendación directa, no la palabra suelta).
const RECOMMENDATION_DENYLIST_PATTERNS = [
  /\b(deber[ií]as?|te recomiendo|te sugiero)\s+(comprar|vender|invertir)\b/i,
  /\bcompra\s+(ahora|ya|ese|esa|este|esta)\b/i,
  /\bvende\s+(ahora|ya|ese|esa|este|esta)\b/i,
  /\binvierte\s+en\b/i,
]

function resolveFieldPath(context: AIContext, fieldPath: string): unknown {
  const parts = fieldPath.split('.')
  // deno-lint-ignore no-explicit-any
  let current: any = context
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}

export interface ValidationResult {
  valid: boolean
  reason?: string
  parsed?: ParsedAIAnalysisResponse
}

export function validateAIResponse(rawText: string, contextSent: AIContext): ValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const parseResult = aiAnalysisResponseSchema.safeParse(json)
  if (!parseResult.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${parseResult.error.message}` }
  }
  const parsed = parseResult.data

  for (const fact of parsed.facts_cited) {
    const resolved = resolveFieldPath(contextSent, fact.field_path)
    if (resolved === undefined) {
      return { valid: false, reason: `facts_cited cita un campo inexistente: "${fact.field_path}".` }
    }
  }

  const textToScan = [parsed.interpretation, parsed.observation ?? '', parsed.behavioral_suggestion ?? ''].join(' ')
  for (const pattern of RECOMMENDATION_DENYLIST_PATTERNS) {
    if (pattern.test(textToScan)) {
      return { valid: false, reason: 'La respuesta contiene lenguaje de recomendación financiera, lo cual está prohibido.' }
    }
  }

  const uncitedNumber = findUncitedSignificantNumber(parsed)
  if (uncitedNumber) {
    return { valid: false, reason: `La respuesta menciona "${uncitedNumber}" sin que aparezca en ningún facts_cited.` }
  }

  return { valid: true, parsed }
}

// Heurística adicional de detección de alucinación: cualquier número "con
// forma de estadística" (decimal, o 2+ dígitos, o seguido de %) mencionado en
// el texto libre de la respuesta debe aparecer también en algún facts_cited.
// Se ignoran números de un solo dígito (demasiado ruido: listas, "punto 3",
// etc. no son alucinaciones de cifras).
function findUncitedSignificantNumber(parsed: ParsedAIAnalysisResponse): string | null {
  const citedValues = parsed.facts_cited.map((f) => f.value).join(' | ')
  const textToScan = [parsed.interpretation, parsed.observation ?? '', parsed.behavioral_suggestion ?? ''].join(' ')
  const numberPattern = /\d+(?:[.,]\d+)?%?/g
  const matches = textToScan.match(numberPattern) ?? []

  for (const match of matches) {
    const digitsOnly = match.replace(/[^\d]/g, '')
    if (digitsOnly.length < 2) continue // un solo dígito: demasiado ruido, no se chequea
    if (!citedValues.includes(match) && !citedValues.includes(digitsOnly)) {
      return match
    }
  }
  return null
}
