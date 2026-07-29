// Fase 4 (Insights cross-trade) — arma el contexto agregado a nivel de CUENTA
// completa, no de un trade individual (a diferencia de contextBuilder.ts). Mismo
// principio no negociable: cada número sale literal de una vista SQL, nunca se
// calcula acá. No hay TEXTO_DEL_USUARIO que aislar — todo el contexto es agregados
// numéricos, no hay texto libre escrito por el usuario en ningún campo de esto.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from './database.types.ts'
import type { DataSufficiency } from './types.ts'
import { calculateDataSufficiency } from './contextBuilder.ts'

// Mínimo de operaciones para que un "mejor/peor activo" sea una señal y no ruido de
// una sola muestra — misma regla que el having >= 3 de
// v_user_stats_by_confluence_combo (20260728140000_confluence_stats_views.sql).
const MIN_SAMPLE_FOR_BEST_WORST = 3

export interface InsightsAggregateStats {
  win_rate: number | null
  profit_factor: number | null
  avg_r: number | null
  total_trades: number
  closed_trades: number
  by_strategy: Array<{ strategy_name: string; win_rate: number | null; trade_count: number }>
  by_confluence_single: Array<{ confluence_name: string; win_rate: number | null; avg_r: number | null; total_trades: number }>
  by_confluence_combo: Array<{ confluence_names: string[]; win_rate: number | null; avg_r: number | null; total_trades: number }>
  by_weekday: Array<{ weekday: number; win_rate: number | null; avg_r: number | null; net_pnl: number | null; total_trades: number }>
  by_hour: Array<{ hour_of_day: number; win_rate: number | null; avg_r: number | null; net_pnl: number | null; total_trades: number }>
  psychology: {
    total_trades: number
    pct_fomo: number | null
    pct_impulsive: number | null
    pct_off_plan: number | null
    pct_disciplined: number | null
    pct_moved_stop: number | null
    pct_moved_tp: number | null
    pct_revenge: number | null
    pct_overtraded: number | null
    pct_hesitated: number | null
    pct_overconfidence: number | null
    pct_closed_early: number | null
    pct_distractions: number | null
  } | null
  best_instrument: { symbol: string; win_rate: number | null; trade_count: number } | null
  worst_instrument: { symbol: string; win_rate: number | null; trade_count: number } | null
}

export interface InsightsContext {
  aggregate_stats: InsightsAggregateStats
  meta: {
    data_sufficiency: DataSufficiency
  }
}

export async function buildInsightsContext(userClient: SupabaseClient<Database>, userId: string): Promise<InsightsContext> {
  const [statsResult, byStrategyResult, byConfluenceSingleResult, byConfluenceComboResult, byWeekdayResult, byHourResult, byInstrumentResult, psychologyResult] =
    await Promise.all([
      userClient.from('v_user_trade_stats').select('*').eq('user_id', userId).maybeSingle(),
      userClient.from('v_user_stats_by_strategy').select('*').eq('user_id', userId),
      userClient.from('v_user_stats_by_confluence_single').select('*').eq('user_id', userId),
      userClient.from('v_user_stats_by_confluence_combo').select('*').eq('user_id', userId),
      userClient.from('v_user_stats_by_weekday').select('*').eq('user_id', userId),
      userClient.from('v_user_stats_by_hour').select('*').eq('user_id', userId),
      userClient.from('v_user_stats_by_instrument').select('*').eq('user_id', userId),
      userClient.from('v_user_psychology_stats').select('*').eq('user_id', userId).maybeSingle(),
    ])

  const totalClosedTrades = statsResult.data?.closed_trades ?? 0

  const instrumentsWithSample = (byInstrumentResult.data ?? []).filter((row) => (row.total_trades ?? 0) >= MIN_SAMPLE_FOR_BEST_WORST)
  const sortedByWinRate = [...instrumentsWithSample].sort((a, b) => (b.win_rate ?? 0) - (a.win_rate ?? 0))
  const bestRow = sortedByWinRate[0] ?? null
  const worstRow = sortedByWinRate.length > 1 ? sortedByWinRate[sortedByWinRate.length - 1] : null

  return {
    aggregate_stats: {
      win_rate: statsResult.data?.win_rate ?? null,
      profit_factor: statsResult.data?.profit_factor ?? null,
      avg_r: statsResult.data?.avg_r ?? null,
      total_trades: statsResult.data?.total_trades ?? 0,
      closed_trades: totalClosedTrades,
      by_strategy: (byStrategyResult.data ?? [])
        .filter((row) => row.strategy_name !== null)
        .map((row) => ({
          strategy_name: row.strategy_name as string,
          win_rate: row.win_rate,
          trade_count: row.trade_count ?? 0,
        })),
      by_confluence_single: (byConfluenceSingleResult.data ?? []).map((row) => ({
        confluence_name: row.confluence_name,
        win_rate: row.win_rate,
        avg_r: row.avg_r,
        total_trades: row.total_trades ?? 0,
      })),
      by_confluence_combo: (byConfluenceComboResult.data ?? []).map((row) => ({
        confluence_names: row.confluence_names ?? [],
        win_rate: row.win_rate,
        avg_r: row.avg_r,
        total_trades: row.total_trades ?? 0,
      })),
      by_weekday: (byWeekdayResult.data ?? []).map((row) => ({
        weekday: row.weekday as number,
        win_rate: row.win_rate,
        avg_r: row.avg_r,
        net_pnl: row.net_pnl,
        total_trades: row.total_trades ?? 0,
      })),
      by_hour: (byHourResult.data ?? []).map((row) => ({
        hour_of_day: row.hour_of_day as number,
        win_rate: row.win_rate,
        avg_r: row.avg_r,
        net_pnl: row.net_pnl,
        total_trades: row.total_trades ?? 0,
      })),
      psychology: psychologyResult.data
        ? {
            total_trades: psychologyResult.data.total_trades ?? 0,
            pct_fomo: psychologyResult.data.pct_fomo,
            pct_impulsive: psychologyResult.data.pct_impulsive,
            pct_off_plan: psychologyResult.data.pct_off_plan,
            pct_disciplined: psychologyResult.data.pct_disciplined,
            pct_moved_stop: psychologyResult.data.pct_moved_stop,
            pct_moved_tp: psychologyResult.data.pct_moved_tp,
            pct_revenge: psychologyResult.data.pct_revenge,
            pct_overtraded: psychologyResult.data.pct_overtraded,
            pct_hesitated: psychologyResult.data.pct_hesitated,
            pct_overconfidence: psychologyResult.data.pct_overconfidence,
            pct_closed_early: psychologyResult.data.pct_closed_early,
            pct_distractions: psychologyResult.data.pct_distractions,
          }
        : null,
      best_instrument: bestRow ? { symbol: bestRow.symbol as string, win_rate: bestRow.win_rate, trade_count: bestRow.total_trades ?? 0 } : null,
      worst_instrument: worstRow ? { symbol: worstRow.symbol as string, win_rate: worstRow.win_rate, trade_count: worstRow.total_trades ?? 0 } : null,
    },
    meta: {
      data_sufficiency: calculateDataSufficiency(totalClosedTrades),
    },
  }
}
