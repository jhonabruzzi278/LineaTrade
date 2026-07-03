import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'

// Espejo de supabase/functions/_shared/types.ts (AIAnalysisResponse /
// AnalyzeTradeErrorCode) — no hay forma de compartir el tipo directamente
// entre el bundle de Vite y el runtime Deno del Edge Function, así que se
// duplica acá. Si cambia la forma de la respuesta en el Edge Function, este
// tipo hay que actualizarlo a mano.
export type DataSufficiency = 'sufficient' | 'limited' | 'insufficient'

export interface FactCited {
  field_path: string
  value: string
}

export interface AIAnalysisResponse {
  data_sufficiency: DataSufficiency
  facts_cited: FactCited[]
  interpretation: string
  observation: string | null
  behavioral_suggestion: string | null
}

export type AnalyzeTradeErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'BAD_REQUEST'
  | 'UNKNOWN'

export type AnalyzeTradeResult =
  | { ok: true; data: AIAnalysisResponse }
  | { ok: false; message: string; code: AnalyzeTradeErrorCode }

/**
 * Invoca el Edge Function analyze-trade. Nunca expone la forma cruda del
 * error de Supabase Functions al resto de la app — todo se traduce a
 * AnalyzeTradeResult (ok/message/code).
 */
export async function analyzeTradeWithAI(tradeId: string): Promise<AnalyzeTradeResult> {
  const { data, error } = await supabase.functions.invoke<AIAnalysisResponse>('analyze-trade', {
    body: { trade_id: tradeId },
  })

  if (error) {
    let code: AnalyzeTradeErrorCode = 'UNKNOWN'
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.clone().json()
        if (typeof body?.code === 'string') code = body.code as AnalyzeTradeErrorCode
      } catch {
        // body no era JSON — code queda 'UNKNOWN'
      }
    }
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message, code }
  }

  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.', code: 'UNKNOWN' }
  }

  return { ok: true, data }
}
