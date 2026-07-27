import { supabase } from './supabase'
import { resolveInstrumentId } from './instruments'
import type { Database } from '../types/database'
import type { Kline } from './marketData/types'
import type { BacktestSession } from './backtestSessions'

export type Trade = Database['public']['Tables']['trades']['Row']

// Versión simplificada de la Sección 5 de docs/lineatrade-backtesting-plan.md: sin
// auto-tracking de confluencias (trade_confluences/chart_annotations no existen
// todavía en este MVP — ver CLAUDE.md). El precio de entrada/salida es el `close`
// de la vela actual del replay (misma simplificación que el plan original ya
// proponía como default: "más simple, determinístico").
export async function openBacktestTrade(params: {
  userId: string
  session: BacktestSession
  currentKline: Kline
  side: 'long' | 'short'
  stopLoss: number | null
  takeProfit: number | null
  positionSize: number
}): Promise<Trade> {
  const instrumentId = await resolveInstrumentId(params.session.symbol, 'crypto', params.userId)

  const { data, error } = await supabase
    .from('trades')
    .insert({
      user_id: params.userId,
      instrument_id: instrumentId,
      side: params.side,
      entry_price: params.currentKline.close,
      stop_loss: params.stopLoss,
      take_profit: params.takeProfit,
      position_size: params.positionSize,
      traded_at: new Date(params.currentKline.time * 1000).toISOString(),
      timeframe: params.session.timeframe,
      status: 'open',
      is_backtest: true,
      backtest_session_id: params.session.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Mismo `update({ exit_price, status: 'closed' })` que TradeDetail.tsx usa para
// cerrar una operación real — trg_calculate_trade_pnl calcula pnl_amount/pnl_r
// server-side sin cambios, el trigger no distingue is_backtest.
export async function closeBacktestTrade(tradeId: string, currentKline: Kline): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .update({ exit_price: currentKline.close, status: 'closed' })
    .eq('id', tradeId)
  if (error) throw error
}
