// extract-trade-image — valida la salida del modelo de visión antes de
// devolverla al cliente. A diferencia de responseValidator.ts (analyze-trade),
// acá no hay un AIContext contra el cual citar campos — la fuente de verdad es
// la imagen misma, y el chequeo humano real pasa en el frontend (el usuario
// revisa/edita el formulario pre-llenado antes de guardar, nunca se guarda
// solo). La validación acá es puramente de forma: JSON válido + schema
// correcto, "no sé" tiene que ser null, nunca un valor inventado.
import { z } from 'npm:zod@3'

export const extractionResponseSchema = z.object({
  market: z.enum(['stock', 'options', 'forex', 'crypto', 'futures', 'index', 'cfd']).nullable(),
  symbol: z.string().nullable(),
  action: z.enum(['long', 'short']).nullable(),
  option_type: z.enum(['call', 'put']).nullable(),
  strike_price: z.number().nullable(),
  expiration_date: z.string().nullable(),
  date: z.string().nullable(),
  time: z.string().nullable(),
  quantity: z.number().nullable(),
  price: z.number().nullable(),
  commission: z.number().nullable(),
  order_number: z.string().nullable(),
  order_placed_time: z.string().nullable(),
  price_type: z.enum(['market', 'limit']).nullable(),
  limit_price: z.number().nullable(),
  bid_price: z.number().nullable(),
  ask_price: z.number().nullable(),
  term: z.string().nullable(),
  all_or_none: z.boolean().nullable(),
})

export type ParsedExtractionResponse = z.infer<typeof extractionResponseSchema>

export interface ExtractionValidationResult {
  valid: boolean
  reason?: string
  parsed?: ParsedExtractionResponse
}

export function validateExtractionResponse(rawText: string): ExtractionValidationResult {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = extractionResponseSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  return { valid: true, parsed: result.data }
}
