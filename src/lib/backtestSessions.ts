import { supabase } from './supabase'
import type { Database } from '../types/database'
import type { MarketInterval } from './marketData/types'

export type BacktestSession = Database['public']['Tables']['backtest_sessions']['Row']

export async function createBacktestSession(params: {
  userId: string
  symbol: string
  interval: MarketInterval
  replayFrom: string // ISO
  replayTo: string // ISO
}): Promise<BacktestSession> {
  const { data, error } = await supabase
    .from('backtest_sessions')
    .insert({
      user_id: params.userId,
      symbol: params.symbol,
      timeframe: params.interval,
      provider: 'binance',
      replay_from: params.replayFrom,
      replay_to: params.replayTo,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function endBacktestSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('backtest_sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}
