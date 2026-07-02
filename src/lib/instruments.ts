import { supabase } from './supabase'
import type { Database } from '../types/database'

type InstrumentMarket = Database['public']['Enums']['instrument_market']

// Busca el instrumento en el catálogo global, luego en los custom del usuario,
// y si no existe lo crea como custom (misma lógica que permite instruments_insert_own).
export async function resolveInstrumentId(
  symbol: string,
  market: InstrumentMarket,
  userId: string,
): Promise<string> {
  const normalizedSymbol = symbol.trim().toUpperCase()

  const { data: global } = await supabase
    .from('instruments')
    .select('id')
    .eq('symbol', normalizedSymbol)
    .eq('market', market)
    .is('created_by', null)
    .maybeSingle()
  if (global) return global.id

  const { data: own } = await supabase
    .from('instruments')
    .select('id')
    .eq('symbol', normalizedSymbol)
    .eq('market', market)
    .eq('created_by', userId)
    .maybeSingle()
  if (own) return own.id

  const { data: created, error } = await supabase
    .from('instruments')
    .insert({ symbol: normalizedSymbol, market, is_custom: true, created_by: userId })
    .select('id')
    .single()
  if (error) throw error
  return created.id
}
