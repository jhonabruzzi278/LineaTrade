// Fase 3 (Motor de IA) — arma las 4 capas del AIContext (context-engine doc §1)
// desde vistas SQL + el trade row. Nunca calcula nada él mismo: cada número en
// aggregate_stats sale literal de una vista; si una vista no tiene fila para
// este usuario, el campo correspondiente queda null/[] — nunca se sustituye
// por un cálculo hecho acá.
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { Database } from './database.types.ts'
import type { AIContext, DataSufficiency, TradeSnapshot } from './types.ts'

type TradeRow = Database['public']['Tables']['trades']['Row']
type InstrumentRow = Database['public']['Tables']['instruments']['Row']

const RECENT_TRADES_LIMIT = 10
// Cap defensivo por campo de texto libre: un usuario podría pegar 50KB en
// "reflection" — esto se aplica ANTES de que promptBuilder cuente tokens, para
// que el conteo real no tenga que lidiar con entradas absurdamente grandes.
const FREE_TEXT_FIELD_CHAR_CAP = 500

export function calculateDataSufficiency(totalClosedTrades: number): DataSufficiency {
  if (totalClosedTrades < 5) return 'insufficient'
  if (totalClosedTrades < 20) return 'limited'
  return 'sufficient'
}

function truncateFreeText(value: string | null): string {
  if (!value) return ''
  return value.length > FREE_TEXT_FIELD_CHAR_CAP ? value.slice(0, FREE_TEXT_FIELD_CHAR_CAP) + '…' : value
}

export async function buildAIContext(
  userClient: SupabaseClient<Database>,
  trade: TradeRow,
  instrument: InstrumentRow,
  promptVersion: number,
): Promise<AIContext> {
  const [statsResult, byStrategyResult, byEmotionResult, ruleViolationsResult, historyResult, rulesResult, objectivesResult, recentTradesResult] =
    await Promise.all([
      userClient.from('v_user_trade_stats').select('*').eq('user_id', trade.user_id).maybeSingle(),
      userClient.from('v_user_stats_by_strategy').select('*').eq('user_id', trade.user_id),
      userClient.from('v_user_stats_by_emotion').select('*').eq('user_id', trade.user_id),
      userClient.from('v_rule_violations').select('*').eq('user_id', trade.user_id).maybeSingle(),
      userClient
        .from('trade_history')
        .select('id', { count: 'exact', head: true })
        .eq('trade_id', trade.id)
        .eq('field_name', 'stop_loss'),
      userClient.from('trader_rules').select('title').eq('user_id', trade.user_id).eq('is_active', true),
      userClient.from('objectives').select('title, current_value, target_value').eq('user_id', trade.user_id).eq('achieved', false),
      userClient
        .from('trades')
        .select('id, traded_at, pnl_r, emotion, strategy_id, strategies(name)')
        .eq('user_id', trade.user_id)
        .eq('status', 'closed')
        .is('deleted_at', null)
        .order('traded_at', { ascending: false })
        .limit(RECENT_TRADES_LIMIT),
    ])

  const totalClosedTrades = statsResult.data?.closed_trades ?? 0
  const dataSufficiency = calculateDataSufficiency(totalClosedTrades)

  const currentTrade: TradeSnapshot = {
    instrument: instrument.symbol,
    side: trade.side,
    entry_price: trade.entry_price,
    exit_price: trade.exit_price,
    stop_loss: trade.stop_loss,
    take_profit: trade.take_profit,
    pnl_r: trade.pnl_r,
    pnl_amount: trade.pnl_amount,
    status: trade.status,
    psychology: {
      emotion: trade.emotion,
      confidence_level: trade.confidence_level,
      stress_level: trade.stress_level,
      followed_plan: trade.followed_plan,
      had_fomo: trade.had_fomo,
      moved_stop_loss_self_reported: trade.moved_stop_loss,
      moved_stop_loss_objective_count: historyResult.count ?? 0,
    },
  }

  return {
    aggregate_stats: {
      win_rate: statsResult.data?.win_rate ?? null,
      profit_factor: statsResult.data?.profit_factor ?? null,
      avg_r: statsResult.data?.avg_r ?? null,
      total_trades: statsResult.data?.total_trades ?? 0,
      closed_trades: totalClosedTrades,
      period: 'all_time',
      by_strategy: (byStrategyResult.data ?? [])
        .filter((row) => row.strategy_name !== null)
        .map((row) => ({
          strategy_name: row.strategy_name as string,
          win_rate: row.win_rate,
          trade_count: row.trade_count ?? 0,
        })),
      by_emotion: (byEmotionResult.data ?? [])
        .filter((row) => row.emotion !== null)
        .map((row) => ({
          emotion: row.emotion as string,
          win_rate: row.win_rate,
          trade_count: row.trade_count ?? 0,
        })),
      rule_violations: ruleViolationsResult.data
        ? [
            {
              rule_flag: ruleViolationsResult.data.rule_flag ?? 'stop_loss_moved',
              objective_count: ruleViolationsResult.data.objective_count ?? 0,
              self_reported_count: ruleViolationsResult.data.self_reported_count ?? 0,
            },
          ]
        : [],
    },
    current_trade: currentTrade,
    historical_context: {
      // Solo campos numéricos/categóricos — nunca texto libre de trades
      // históricos (más estricto que el ejemplo del doc, pero es la lectura
      // correcta de "aislados explícitamente": el texto libre solo viaja para
      // el trade que se está analizando ahora mismo, ver meta abajo).
      recent_trades_summary: (recentTradesResult.data ?? []).map((row) => ({
        id: row.id,
        date: row.traded_at,
        result_r: row.pnl_r,
        // El join a strategies puede venir null si strategy_id es null.
        strategy: (row as unknown as { strategies: { name: string } | null }).strategies?.name ?? null,
        emotion: row.emotion,
      })),
      active_rules: (rulesResult.data ?? []).map((r) => r.title),
      active_objectives: (objectivesResult.data ?? []).map((o) => ({
        title: o.title,
        progress_percent: o.target_value > 0 ? Math.round((Number(o.current_value ?? 0) / Number(o.target_value)) * 100) : 0,
      })),
    },
    meta: {
      prompt_version: promptVersion,
      data_sufficiency: dataSufficiency,
      // Todos los campos de texto libre del trade ACTUAL, no solo
      // reflection/lesson_learned — cualquiera de estos lo escribe el usuario
      // a mano y debe pasar por el aislamiento anti-prompt-injection.
      user_free_text_fields: {
        entry_reason: truncateFreeText(trade.entry_reason),
        confirmations: truncateFreeText(trade.confirmations),
        context_before: truncateFreeText(trade.context_before),
        context_during: truncateFreeText(trade.context_during),
        management_notes: truncateFreeText(trade.management_notes),
        context_after: truncateFreeText(trade.context_after),
        reflection: truncateFreeText(trade.reflection),
        main_mistake: truncateFreeText(trade.main_mistake),
        what_to_repeat: truncateFreeText(trade.what_to_repeat),
        what_to_avoid: truncateFreeText(trade.what_to_avoid),
        lesson_learned: truncateFreeText(trade.lesson_learned),
      },
    },
  }
}
