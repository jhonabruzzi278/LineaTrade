import { supabase } from './supabase'
import type { Database } from '../types/database'

type WeekdayStat = Database['public']['Views']['v_user_stats_by_weekday']['Row']
type HourStat = Database['public']['Views']['v_user_stats_by_hour']['Row']
type InstrumentStat = Database['public']['Views']['v_user_stats_by_instrument']['Row']
type ConfluenceSingleStat = Database['public']['Views']['v_user_stats_by_confluence_single']['Row']
type ConfluenceComboStat = Database['public']['Views']['v_user_stats_by_confluence_combo']['Row']
type PsychologyPctStat = Database['public']['Views']['v_user_psychology_stats']['Row']

export type { WeekdayStat, HourStat, InstrumentStat, ConfluenceSingleStat, ConfluenceComboStat, PsychologyPctStat }

export const MIN_SAMPLE_FOR_HEATMAP = 3

export async function getWeekdayStats(): Promise<WeekdayStat[]> {
  const { data, error } = await supabase.from('v_user_stats_by_weekday').select('*').order('weekday', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getHourStats(): Promise<HourStat[]> {
  const { data, error } = await supabase.from('v_user_stats_by_hour').select('*').order('hour_of_day', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getInstrumentStats(): Promise<InstrumentStat[]> {
  const { data, error } = await supabase.from('v_user_stats_by_instrument').select('*').order('total_trades', { ascending: false }).limit(10)
  if (error) throw error
  return data ?? []
}

export async function getConfluenceSingleStats(): Promise<ConfluenceSingleStat[]> {
  const { data, error } = await supabase.from('v_user_stats_by_confluence_single').select('*').order('total_trades', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getConfluenceComboStats(): Promise<ConfluenceComboStat[]> {
  const { data, error } = await supabase.from('v_user_stats_by_confluence_combo').select('*').order('total_trades', { ascending: false })
  if (error) throw error
  return data ?? []
}

// v_user_psychology_stats es una fila por usuario (no una serie), a diferencia
// de las otras 5 vistas de este módulo — de ahí maybeSingle() en vez de una
// lista.
export async function getPsychologyPctStats(): Promise<PsychologyPctStat | null> {
  const { data, error } = await supabase.from('v_user_psychology_stats').select('*').maybeSingle()
  if (error) throw error
  return data
}
