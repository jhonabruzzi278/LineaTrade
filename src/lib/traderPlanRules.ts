import type { TraderPlan } from './traderPlanEngine'

// Borradores de reglas de /sistema derivados del plan de IA Trader. Son texto
// armado con las cifras que el motor determinista ya calculó: no hay IA ni cifras
// nuevas. Se insertan desactivadas (is_active = false) para que el usuario las
// revise y las active él mismo.
export interface RuleDraft {
  title: string
  description: string
}

const SOURCE_NOTE = 'Del plan de IA Trader.'

function formatNumber(value: number): string {
  return String(value).replace('.', ',')
}

export function buildRuleDrafts(plan: TraderPlan): RuleDraft[] {
  const risk = formatNumber(plan.riskPerTradePercent)
  return [
    {
      title: `Arriesgar como máximo ${risk}% del capital por operación`,
      description: `${SOURCE_NOTE} Define el tamaño de la posición a partir de la distancia al stop.`,
    },
    {
      title: `Relación riesgo:beneficio mínima de 1:${formatNumber(plan.riskRewardRatio)}`,
      description: `${SOURCE_NOTE} Si el objetivo no ofrece esa relación, la operación no entra.`,
    },
    {
      title: `Apalancamiento máximo de 1:${formatNumber(plan.maxLeverage)}`,
      description: SOURCE_NOTE,
    },
    {
      title: `Dejar de operar la semana al perder ${formatNumber(plan.maxWeeklyLossMultiple)}× el riesgo por operación`,
      description: `${SOURCE_NOTE} Es un límite de pérdida semanal: al alcanzarlo, se revisa antes de volver a operar.`,
    },
  ]
}

/** Descarta los borradores cuyo título ya existe entre las reglas del usuario (sin distinguir mayúsculas). */
export function filterNewDrafts(drafts: RuleDraft[], existingTitles: string[]): RuleDraft[] {
  const existing = new Set(existingTitles.map((t) => t.trim().toLowerCase()))
  return drafts.filter((d) => !existing.has(d.title.trim().toLowerCase()))
}
