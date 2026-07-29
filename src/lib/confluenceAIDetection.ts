import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'
import type { DetectionCandidate } from './confluenceDetection'

export type ConfluenceEvaluation = {
  key: string
  keep: boolean
  confidence: number
  note: string
}

export type DetectConfluencesResult = { ok: true; evaluations: ConfluenceEvaluation[] } | { ok: false; message: string }

// Manda solo lo que la IA necesita para juzgar relevancia (key/nombre/rationale) — no
// hace falta reenviar coordenadas de tiempo/precio, esas nunca se le piden de vuelta
// (ver detect-confluences: la IA solo puede devolver keep/confidence/note por key ya
// existente, nunca una coordenada nueva).
export async function detectConfluencesWithAI(
  symbol: string,
  timeframe: string,
  candidates: DetectionCandidate[],
): Promise<DetectConfluencesResult> {
  if (candidates.length === 0) return { ok: true, evaluations: [] }

  const { data, error } = await supabase.functions.invoke<{ evaluations: ConfluenceEvaluation[] }>('detect-confluences', {
    body: {
      symbol,
      timeframe,
      candidates: candidates.map((c) => ({
        key: c.key,
        confluence_name: c.confluenceName,
        time_start: c.timeStart,
        price_start: c.priceStart,
        rationale: c.rationale,
      })),
    },
  })

  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.' }
  }
  return { ok: true, evaluations: data.evaluations }
}
