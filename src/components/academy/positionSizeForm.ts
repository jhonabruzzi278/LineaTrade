import { useMemo, useState } from 'react'
import type { SavedTradePlan } from '../../hooks/useLessonPractice'
import {
  calculatePositionSize,
  parseDecimalInput,
  type PositionSizeIssue,
  type PositionSizeOutcome,
  type TradeDirection,
} from '../../lib/positionSize'

export interface CalculatorValues {
  balance: string
  riskPercent: string
  symbol: string
  direction: TradeDirection
  entry: string
  stop: string
  target: string
}

// Precios de ejemplo de la lección (el campo lo dice: «usa los de tu instrumento»).
const EXAMPLE_VALUES: CalculatorValues = {
  balance: '10,000',
  riskPercent: '1%',
  symbol: 'AAPL',
  direction: 'long',
  entry: '190.00',
  stop: '188.00',
  target: '194.00',
}

function valuesFromPlan(plan: SavedTradePlan | null): CalculatorValues {
  if (!plan) return EXAMPLE_VALUES
  return {
    balance: plan.balance.toLocaleString('es-MX'),
    riskPercent: `${plan.riskPercent}%`,
    symbol: plan.symbol,
    direction: plan.direction,
    entry: String(plan.entry),
    stop: String(plan.stop),
    target: String(plan.target),
  }
}

export interface CalculatorForm {
  values: CalculatorValues
  setValue: <K extends keyof CalculatorValues>(key: K, value: CalculatorValues[K]) => void
  outcome: PositionSizeOutcome
  /** Precios ya interpretados (NaN si el texto no es un número). */
  prices: { entry: number; stop: number; target: number }
  /** Plan listo para guardar, o `null` mientras haya datos inválidos o tamaño 0. */
  buildPlan: () => SavedTradePlan | null
}

export function useCalculatorForm(initialPlan: SavedTradePlan | null): CalculatorForm {
  const [values, setValues] = useState<CalculatorValues>(() => valuesFromPlan(initialPlan))

  const parsed = useMemo(
    () => ({
      balance: parseDecimalInput(values.balance) ?? Number.NaN,
      riskPercent: parseDecimalInput(values.riskPercent) ?? Number.NaN,
      entry: parseDecimalInput(values.entry) ?? Number.NaN,
      stop: parseDecimalInput(values.stop) ?? Number.NaN,
      target: parseDecimalInput(values.target) ?? Number.NaN,
    }),
    [values],
  )

  const outcome = useMemo(() => calculatePositionSize({ ...parsed, direction: values.direction }), [parsed, values.direction])

  return {
    values,
    setValue: (key, value) => setValues((current) => ({ ...current, [key]: value })),
    outcome,
    prices: { entry: parsed.entry, stop: parsed.stop, target: parsed.target },
    buildPlan: () => {
      if (!outcome.ok || outcome.result.size < 1) return null
      return {
        symbol: values.symbol.trim() || 'Instrumento',
        direction: values.direction,
        entry: parsed.entry,
        stop: parsed.stop,
        target: parsed.target,
        size: outcome.result.size,
        riskAmount: outcome.result.riskAmount,
        balance: parsed.balance,
        riskPercent: parsed.riskPercent,
      }
    },
  }
}

export function issueMessage(issue: PositionSizeIssue, direction: TradeDirection): string {
  const long = direction === 'long'
  switch (issue) {
    case 'balance':
      return 'Escribe un saldo mayor que 0.'
    case 'risk':
      return 'El riesgo debe ser mayor que 0 y no pasar de 100 %.'
    case 'entry':
      return 'Escribe una entrada mayor que 0.'
    case 'stop':
      return 'Escribe un stop mayor que 0.'
    case 'target':
      return 'Escribe un objetivo mayor que 0.'
    case 'stop-same-as-entry':
      return 'El stop no puede ser igual a la entrada.'
    case 'stop-wrong-side':
      return long ? 'En largo, el stop va por debajo de la entrada.' : 'En corto, el stop va por encima de la entrada.'
    case 'target-wrong-side':
      return long ? 'En largo, el objetivo va por encima de la entrada.' : 'En corto, el objetivo va por debajo de la entrada.'
  }
}
