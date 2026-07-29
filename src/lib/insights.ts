import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'
import type { Database } from '../types/database'

export interface FactCited {
  field_path: string
  value: string
}

export interface Insight {
  text: string
  facts_cited: FactCited[]
}

export type GenerateInsightsResult = { ok: true; insights: Insight[] } | { ok: false; message: string }

export async function generateInsights(): Promise<GenerateInsightsResult> {
  const { data, error } = await supabase.functions.invoke<{ insights: Insight[] }>('generate-insights', { body: {} })

  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) {
    return { ok: false, message: 'El Edge Function no devolvió datos.' }
  }
  return { ok: true, insights: data.insights }
}

export type StoredInsightsRow = Database['public']['Tables']['ai_insights']['Row']

// Última tanda de insights ya generada — evita mostrar la sección vacía en cada visita
// al Dashboard si el usuario ya generó insights antes en otra sesión.
export async function getLatestInsights(userId: string): Promise<StoredInsightsRow | null> {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}
