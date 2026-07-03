// Fase 3 (Motor de IA) — tipos compartidos del Edge Function analyze-trade.
// Espejo de docs/trade-journal-os-context-engine.md §1, §3, §6. La forma de
// estos tipos es el contrato entre contextBuilder/promptBuilder/responseValidator
// — no cambiarla sin revisar los tres módulos a la vez.

export type DataSufficiency = 'sufficient' | 'limited' | 'insufficient'

export interface AggregateStats {
  win_rate: number | null
  profit_factor: number | null
  avg_r: number | null
  total_trades: number
  closed_trades: number
  period: 'all_time'
  by_strategy: Array<{ strategy_name: string; win_rate: number | null; trade_count: number }>
  by_emotion: Array<{ emotion: string; win_rate: number | null; trade_count: number }>
  rule_violations: Array<{ rule_flag: string; objective_count: number; self_reported_count: number }>
}

export interface TradeSnapshot {
  instrument: string
  side: 'long' | 'short'
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  take_profit: number | null
  pnl_r: number | null
  pnl_amount: number | null
  status: 'open' | 'closed'
  psychology: {
    emotion: string | null
    confidence_level: number | null
    stress_level: number | null
    followed_plan: boolean | null
    had_fomo: boolean | null
    moved_stop_loss_self_reported: boolean | null
    moved_stop_loss_objective_count: number
  }
}

export interface HistoricalContext {
  recent_trades_summary: Array<{
    id: string
    date: string
    result_r: number | null
    strategy: string | null
    emotion: string | null
  }>
  active_rules: string[]
  active_objectives: Array<{ title: string; progress_percent: number }>
}

export interface AIContext {
  aggregate_stats: AggregateStats
  current_trade: TradeSnapshot
  historical_context: HistoricalContext
  meta: {
    prompt_version: number
    data_sufficiency: DataSufficiency
    user_free_text_fields: Record<string, string>
  }
}

export interface FactCited {
  field_path: string
  value: string
}

export interface AIAnalysisResponse {
  data_sufficiency: DataSufficiency
  facts_cited: FactCited[]
  interpretation: string
  observation: string | null
  behavioral_suggestion: string | null
}

export type AnalyzeTradeErrorCode =
  | 'NOT_FOUND'
  | 'RATE_LIMIT'
  | 'PROVIDER_UNAVAILABLE'
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'BAD_REQUEST'
  | 'UNKNOWN'

export interface AnalyzeTradeErrorBody {
  error: string
  code: AnalyzeTradeErrorCode
  requests_count?: number
  daily_limit?: number
}
