// "Convierte la IA en tu trader" — motor de scoring determinista. Sin LLM: es
// una función pura que traduce las respuestas del quiz (src/data/traderQuiz.ts)
// a un plan de trading, siguiendo el mismo principio del resto del producto
// ("el sistema calcula, la IA solo interpreta" — ver CLAUDE.md). La matemática
// de win rate mínimo / expectativa es genérica de trading (breakeven = 1 /
// (1 + R:R)), no viene de ningún producto de terceros.

export type TraderLevel = 'principiante' | 'intermedio' | 'avanzado'
export type TraderStyle = 'scalping' | 'day_trading' | 'swing_trading' | 'position_trading'
export type TraderArchetype = 'seguimiento_tendencia' | 'reversion_media' | 'ruptura'
export type InstrumentCategory = 'acciones' | 'forex' | 'cripto' | 'futuros' | 'otro'

export const INSTRUMENT_CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  acciones: 'Acciones',
  forex: 'Forex',
  cripto: 'Criptomonedas',
  futuros: 'Futuros',
  otro: 'Otro',
}

export interface TraderPlan {
  level: TraderLevel
  style: TraderStyle
  archetype: TraderArchetype
  instrumentCategory: InstrumentCategory
  recommendedInstrument: string
  riskPerTradePercent: number
  riskRewardRatio: number
  maxLeverage: number
  minViableWinRatePercent: number
  floorExpectancyR: number
  maxWeeklyLossMultiple: number
  realisticMonthlyReturnRange: [number, number]
  redFlags: string[]
  operatingRoutine: string[]
}

const OPERATING_ROUTINE = [
  'Pre-market: revisa tu instrumento y marca tus niveles antes de operar.',
  'Ejecución: entra solo si se cumple tu regla — si dudas, no es tu operación.',
  'Journaling: anota cada operación (motivo, riesgo, resultado, cómo te sentiste).',
  'Review: revisa tu journal cada semana, ahí está lo que hay que corregir.',
]

export const STYLE_LABELS: Record<TraderStyle, string> = {
  scalping: 'Scalping',
  day_trading: 'Day trading',
  swing_trading: 'Swing trading',
  position_trading: 'Position trading',
}

export const ARCHETYPE_LABELS: Record<TraderArchetype, string> = {
  seguimiento_tendencia: 'Seguimiento de tendencia',
  reversion_media: 'Reversión a la media',
  ruptura: 'Ruptura (breakout)',
}

function computeLevel(answers: Record<string, string>): TraderLevel {
  if (answers.experience === 'years') return 'intermedio'
  return 'principiante'
}

function computeStyle(answers: Record<string, string>): TraderStyle {
  const patientHolding = answers.holding_tolerance === 'comfortable' || answers.holding_tolerance === 'ok_if_winning'
  const wantsToCloseDaily = answers.end_of_day_pref === 'close_everything'
  const lowTime = answers.daily_time === 'minimal' || answers.daily_time === 'half_to_1h'
  const highTime = answers.daily_time === 'many_hours'
  const almostDaily = answers.days_per_week === 'almost_daily'

  if (!wantsToCloseDaily && patientHolding && lowTime) return 'position_trading'
  if (!wantsToCloseDaily && patientHolding) return 'swing_trading'
  if (wantsToCloseDaily && highTime && almostDaily) return 'scalping'
  if (wantsToCloseDaily) return 'day_trading'
  return 'swing_trading'
}

function computeArchetype(answers: Record<string, string>): TraderArchetype {
  const impulsive = answers.quick_decisions === 'impulsive_then_regrets'
  if (answers.patience === 'patient' && !impulsive) return 'seguimiento_tendencia'
  if (answers.patience === 'needs_action' || impulsive) return 'ruptura'
  return 'reversion_media'
}

const CRYPTO_INSTRUMENT = 'BTC/USDT' // par líder de Binance — ver lib/binancePriceHistory.ts

function computeInstrument(answers: Record<string, string>): { category: InstrumentCategory; instrument: string } {
  switch (answers.market_pull) {
    case 'forex':
      return { category: 'forex', instrument: 'EUR/USD' }
    case 'indices':
      return { category: 'futuros', instrument: 'US500 (futuro del S&P 500)' }
    case 'crypto':
      return { category: 'cripto', instrument: CRYPTO_INSTRUMENT }
    case 'stocks':
      return { category: 'acciones', instrument: 'AAPL' }
    case 'commodities':
      return { category: 'futuros', instrument: 'XAU/USD (oro)' }
    default:
      break
  }

  switch (answers.volatility_pref) {
    case 'calm':
      return { category: 'forex', instrument: 'EUR/USD' }
    case 'some_movement':
      return { category: 'acciones', instrument: 'AAPL' }
    default:
      return { category: 'cripto', instrument: CRYPTO_INSTRUMENT }
  }
}

interface RiskTier {
  riskPerTradePercent: number
  riskRewardRatio: number
  maxLeverage: number
  maxWeeklyLossMultiple: number
  monthlyReturnRange: [number, number]
}

const RISK_TIERS: Record<'estable' | 'moderado' | 'fragil', RiskTier> = {
  estable: { riskPerTradePercent: 1, riskRewardRatio: 2.5, maxLeverage: 2, maxWeeklyLossMultiple: 4, monthlyReturnRange: [2, 5] },
  moderado: { riskPerTradePercent: 0.5, riskRewardRatio: 3, maxLeverage: 1, maxWeeklyLossMultiple: 4, monthlyReturnRange: [1, 3] },
  fragil: { riskPerTradePercent: 0.25, riskRewardRatio: 3, maxLeverage: 1, maxWeeklyLossMultiple: 3, monthlyReturnRange: [1, 2] },
}

// Puntaje de fragilidad conductual/financiera: más alto = más protector debe
// ser el plan (no al revés — un perfil que "se la juega" con ingresos
// inestables recibe MENOS riesgo permitido, no más, porque el plan protege de
// la propia conducta, no la premia).
function computeFragilityScore(answers: Record<string, string>): number {
  let score = 0
  score += { calm: 0, annoyed_but_follows_plan: 0, wants_revenge: 2, freezes: 1 }[answers.loss_reaction] ?? 1
  score += { accept: 0, uncomfortable_but_holds: 1, cuts_risk_hard: 1, would_quit: 2 }[answers.drawdown_reaction] ?? 1
  score += { goes_for_it: 2, calculates_then_acts: 1, cautious: 0, avoids_risk: 0 }[answers.risk_description] ?? 1
  score += { stable: 0, variable_sufficient: 1, unstable: 2 }[answers.income_stability] ?? 1
  score += { spare_savings: 0, part_of_savings: 0, needed_soon: 1, borrowed: 2 }[answers.capital_source] ?? 1
  return score
}

function computeRiskTier(answers: Record<string, string>): RiskTier {
  const score = computeFragilityScore(answers)
  if (score <= 2) return RISK_TIERS.estable
  if (score <= 5) return RISK_TIERS.moderado
  return RISK_TIERS.fragil
}

// breakeven = 1 / (1 + R:R); +6 puntos de colchón por spread/comisiones.
const COST_BUFFER_POINTS = 6

function computeWinRateAndExpectancy(riskRewardRatio: number): { minViableWinRatePercent: number; floorExpectancyR: number } {
  const breakevenPercent = (1 / (1 + riskRewardRatio)) * 100
  const minViableWinRatePercent = Math.round(breakevenPercent + COST_BUFFER_POINTS)
  const winFraction = minViableWinRatePercent / 100
  const floorExpectancyR = Math.round((winFraction * riskRewardRatio - (1 - winFraction)) * 100) / 100
  return { minViableWinRatePercent, floorExpectancyR }
}

function computeRedFlags(answers: Record<string, string>): string[] {
  const flags: string[] = []

  if (answers.capital_source === 'borrowed') {
    flags.push('Vas a operar con dinero prestado o de una tarjeta — nunca arriesgues capital que no sea tuyo.')
  }
  if (answers.capital_source === 'needed_soon') {
    flags.push('Ese dinero lo vas a necesitar pronto para otra cosa — el trading no es el lugar para él.')
  }
  if (answers.income_stability === 'unstable' && answers.risk_description === 'goes_for_it') {
    flags.push('Ingresos inestables combinados con un perfil que "se la juega" — es la mezcla que más rápido vacía una cuenta.')
  }
  if (answers.drawdown_reaction === 'would_quit') {
    flags.push('Dijiste que no aguantarías una caída del 20% — respeta el riesgo por operación de este plan al pie de la letra.')
  }
  if (answers.loss_reaction === 'wants_revenge') {
    flags.push('Tiendes a querer "recuperar" una pérdida de inmediato — define de antemano cuándo paras, antes de que pase.')
  }

  return flags
}

export function computeTraderPlan(answers: Record<string, string>): TraderPlan {
  const level = computeLevel(answers)
  const style = computeStyle(answers)
  const archetype = computeArchetype(answers)
  const { category, instrument } = computeInstrument(answers)
  const riskTier = computeRiskTier(answers)
  const { minViableWinRatePercent, floorExpectancyR } = computeWinRateAndExpectancy(riskTier.riskRewardRatio)

  return {
    level,
    style,
    archetype,
    instrumentCategory: category,
    recommendedInstrument: instrument,
    riskPerTradePercent: riskTier.riskPerTradePercent,
    riskRewardRatio: riskTier.riskRewardRatio,
    maxLeverage: riskTier.maxLeverage,
    minViableWinRatePercent,
    floorExpectancyR,
    maxWeeklyLossMultiple: riskTier.maxWeeklyLossMultiple,
    realisticMonthlyReturnRange: riskTier.monthlyReturnRange,
    redFlags: computeRedFlags(answers),
    operatingRoutine: OPERATING_ROUTINE,
  }
}
