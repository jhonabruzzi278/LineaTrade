import { supabase } from './supabase'
import type { Database } from '../types/database'

export type ConfluenceType = Database['public']['Tables']['confluence_types']['Row']
export type ChartAnnotation = Database['public']['Tables']['chart_annotations']['Row']
export type ConfluenceShape = ConfluenceType['shape']

// Sin filtro por user_id acá: la policy confluence_types_select ya devuelve
// "is_system = true or user_id = auth.uid()" — filtrar de nuevo en el cliente sería
// redundante con lo que RLS ya garantiza (mismo principio ya aplicado en el resto del
// repo: el backend decide qué filas existen, el cliente solo las pide).
export async function listConfluenceTypes(): Promise<ConfluenceType[]> {
  const { data, error } = await supabase
    .from('confluence_types')
    .select()
    .order('is_system', { ascending: false })
    .order('name')
  if (error) throw error
  return data
}

export async function createConfluenceType(params: {
  userId: string
  name: string
  color: string
  shape: ConfluenceShape
}): Promise<ConfluenceType> {
  const { data, error } = await supabase
    .from('confluence_types')
    .insert({
      user_id: params.userId,
      name: params.name,
      color: params.color,
      shape: params.shape,
      is_system: false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteConfluenceType(id: string): Promise<void> {
  const { error } = await supabase.from('confluence_types').delete().eq('id', id)
  if (error) throw error
}

export async function listChartAnnotations(backtestSessionId: string): Promise<ChartAnnotation[]> {
  const { data, error } = await supabase
    .from('chart_annotations')
    .select()
    .eq('backtest_session_id', backtestSessionId)
    .order('time_start')
  if (error) throw error
  return data
}

export async function createChartAnnotation(params: {
  userId: string
  backtestSessionId: string
  symbol: string
  timeframe: string
  confluenceTypeId: string
  timeStart: number
  priceStart: number
  timeEnd?: number | null
  priceEnd?: number | null
  source?: 'manual' | 'ai_suggested'
}): Promise<ChartAnnotation> {
  const { data, error } = await supabase
    .from('chart_annotations')
    .insert({
      user_id: params.userId,
      backtest_session_id: params.backtestSessionId,
      symbol: params.symbol,
      timeframe: params.timeframe,
      confluence_type_id: params.confluenceTypeId,
      time_start: params.timeStart,
      price_start: params.priceStart,
      time_end: params.timeEnd ?? null,
      price_end: params.priceEnd ?? null,
      source: params.source ?? 'manual',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteChartAnnotation(id: string): Promise<void> {
  const { error } = await supabase.from('chart_annotations').delete().eq('id', id)
  if (error) throw error
}

// Objetos de rango (dibujados con dos clics: dos esquinas para square/rectangle, dos
// puntos de una línea para BOS) vs. objetos puntuales (un solo clic: circle/arrow/label,
// renderizados como marcador de lightweight-charts en vez de un primitive propio).
export function isRangeShape(shape: ConfluenceShape): boolean {
  return shape === 'square' || shape === 'rectangle' || shape === 'line'
}
