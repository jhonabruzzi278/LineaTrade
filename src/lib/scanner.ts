import { supabase } from './supabase'
import { getFunctionErrorMessage } from './errors'
import type { Database } from '../types/database'

export type ScannerResult = Database['public']['Tables']['scanner_results']['Row']

export async function listScannerResults(): Promise<ScannerResult[]> {
  const { data, error } = await supabase.from('scanner_results').select('*').order('scanned_at', { ascending: false })
  if (error) throw error
  return data
}

export interface ScannerQueryCondition {
  field: string
  operator: '>' | '<' | '>=' | '<=' | '='
  value: number
}

export type ResolveScannerQueryResult =
  | { ok: true; conditions: ScannerQueryCondition[] }
  | { ok: false; message: string }

export async function resolveScannerQuery(text: string): Promise<ResolveScannerQueryResult> {
  const { data, error } = await supabase.functions.invoke<{ conditions: ScannerQueryCondition[] }>('resolve-scanner-query', {
    body: { text },
  })
  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) return { ok: false, message: 'El Edge Function no devolvió datos.' }
  return { ok: true, conditions: data.conditions }
}

export interface ScanExplanation {
  explanation: string
  facts_cited: Array<{ field_path: string; value: string }>
}

export type ExplainScanResultResult = { ok: true; data: ScanExplanation } | { ok: false; message: string }

export async function explainScanResult(symbol: string): Promise<ExplainScanResultResult> {
  const { data, error } = await supabase.functions.invoke<ScanExplanation>('explain-scan-result', {
    body: { symbol },
  })
  if (error) {
    const message = await getFunctionErrorMessage(error)
    return { ok: false, message }
  }
  if (!data) return { ok: false, message: 'El Edge Function no devolvió datos.' }
  return { ok: true, data }
}
