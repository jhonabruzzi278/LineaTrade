import { supabase } from './supabase'
import { resolveInstrumentId } from './instruments'
import { listChartAnnotations } from './confluences'
import type { Database } from '../types/database'
import type { Kline } from './marketData/types'
import type { BacktestSession } from './backtestSessions'

export type Trade = Database['public']['Tables']['trades']['Row']

// El precio de entrada/salida es el `close` de la vela actual del replay (misma
// simplificación que el plan original ya proponía como default: "más simple,
// determinístico"). Auto-tracking de confluencias agregado en la Fase 2 del plan de
// confluencias — ver attachVisibleConfluences más abajo.
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
  await attachVisibleConfluences(params.userId, data.id, params.session.id, params.currentKline.time)
  return data
}

// Población 100% automática de trade_confluences (Módulo 3 del spec: "nunca se
// escribe a mano") — copia las confluencias dibujadas hasta la vela en la que se
// abrió la operación, que es el contexto real que el trader tenía frente a sí al
// decidir entrar. No se re-ejecuta al cerrar: lo que importa es qué confluencias
// motivaron la entrada, no las que se dibujaron después mientras la operación seguía
// abierta.
async function attachVisibleConfluences(
  userId: string,
  tradeId: string,
  backtestSessionId: string,
  upToTime: number,
): Promise<void> {
  const annotations = await listChartAnnotations(backtestSessionId)
  const visibleTypeIds = new Set(
    annotations.filter((a) => a.time_start <= upToTime).map((a) => a.confluence_type_id),
  )
  if (visibleTypeIds.size === 0) return
  const rows = Array.from(visibleTypeIds).map((confluenceTypeId) => ({
    trade_id: tradeId,
    confluence_type_id: confluenceTypeId,
    user_id: userId,
  }))
  const { error } = await supabase.from('trade_confluences').insert(rows)
  if (error) throw error
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
