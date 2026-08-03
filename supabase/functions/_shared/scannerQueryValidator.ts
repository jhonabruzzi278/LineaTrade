// Validator para resolve-scanner-query: solo deja pasar condiciones cuyos campos
// pertenezcan al vocabulario cerrado de scanner_results. `field` se restringe con
// z.enum directo en el schema (no un z.string() + filtro posterior) para que Zod
// mismo sea la única fuente de verdad del vocabulario permitido — si el modelo
// devuelve un campo fuera de este enum, safeParse ya lo marca como item inválido
// del array y se descarta esa condición puntual (no toda la respuesta); si no
// queda ninguna condición válida, la respuesta se considera inválida.
import { z } from 'npm:zod@3'

const SCANNER_FIELD_ENUM = [
  'price_change_pct',
  'volume_spike_ratio',
  'rsi_14',
  'macd_line',
  'macd_signal',
  'macd_histogram',
  'bollinger_percent_b',
  'last_price',
] as const

const OPERATOR_ENUM = ['>', '<', '>=', '<=', '='] as const

export interface ScannerQueryCondition {
  field: (typeof SCANNER_FIELD_ENUM)[number]
  operator: '>' | '<' | '>=' | '<=' | '='
  value: number
}

const conditionSchema = z.object({
  field: z.enum(SCANNER_FIELD_ENUM),
  operator: z.enum(OPERATOR_ENUM),
  value: z.number(),
})

// z.array de un schema con campo z.enum: cada elemento se valida por separado, así
// que un elemento con un `field` fuera del enum falla individualmente en
// safeParse — se filtra abajo por índice en vez de descartar el array entero.
const responseSchema = z.object({
  conditions: z.array(z.unknown()),
})

export function validateScannerQueryResponse(
  rawText: string,
): { valid: true; conditions: ScannerQueryCondition[] } | { valid: false; reason: string } {
  let json: unknown
  try {
    json = JSON.parse(rawText)
  } catch {
    return { valid: false, reason: 'La respuesta no es JSON válido.' }
  }

  const result = responseSchema.safeParse(json)
  if (!result.success) {
    return { valid: false, reason: `La respuesta no cumple el schema esperado: ${result.error.message}` }
  }

  const validConditions = result.data.conditions.flatMap((raw) => {
    const parsed = conditionSchema.safeParse(raw)
    return parsed.success ? [parsed.data] : []
  })

  if (validConditions.length === 0) {
    return { valid: false, reason: 'Ninguna de las condiciones usa un campo reconocible del escáner.' }
  }

  return { valid: true, conditions: validConditions }
}
