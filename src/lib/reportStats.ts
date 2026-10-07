import { supabase } from './supabase'
import type { Database } from '../types/database'
import type { ClosedTradeRow } from './reportCompute'

export * from './reportCompute'

type TradesSelect = Pick<
  Database['public']['Tables']['trades']['Row'],
  'traded_at' | 'pnl_amount' | 'pnl_r' | 'duration_minutes' | 'strategy_id'
> & {
  strategies: Pick<Database['public']['Tables']['strategies']['Row'], 'name'> | null
}

// Todos los trades reales (is_backtest = false) ya cerrados del usuario, ordenados
// cronológicamente: la única consulta que necesita /reporte. El resto (rachas, mejor/
// peor día-semana-modelo, drawdown, curva de capital) es aritmética pura sobre estas
// filas en computeReportStats(); pnl_amount/pnl_r ya vienen del trigger del backend.
export async function getClosedRealTrades(userId: string): Promise<ClosedTradeRow[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('traded_at, pnl_amount, pnl_r, duration_minutes, strategy_id, strategies(name)')
    .eq('user_id', userId)
    .eq('is_backtest', false)
    .eq('status', 'closed')
    .is('deleted_at', null)
    .order('traded_at', { ascending: true })
  if (error) throw error

  const rows = (data as TradesSelect[] | null) ?? []
  return rows
    .filter((row): row is TradesSelect & { pnl_amount: number } => row.pnl_amount != null)
    .map((row) => ({
      traded_at: row.traded_at,
      pnl_amount: row.pnl_amount,
      pnl_r: row.pnl_r,
      duration_minutes: row.duration_minutes,
      strategy_id: row.strategy_id,
      strategy_name: row.strategies?.name ?? null,
    }))
}
