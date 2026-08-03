import { supabase } from './supabase'
import type { Database } from '../types/database'

export type PsychologyTagStat = Database['public']['Views']['v_user_psychology_tag_stats']['Row']

export const MIN_SAMPLE_FOR_SHOW = 3

export async function getPsychologyTagStats(): Promise<PsychologyTagStat[]> {
  const { data, error } = await supabase
    .from('v_user_psychology_tag_stats')
    .select('*')
    .order('total_trades', { ascending: false })
  if (error) throw error
  return (data ?? []).filter((row) => row.total_trades != null && row.total_trades >= MIN_SAMPLE_FOR_SHOW)
}
