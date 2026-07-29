// Fase 4 (Insights cross-trade) — prompt fijo. No hay TEXTO_DEL_USUARIO que separar
// del system prompt (a diferencia de promptBuilder.ts/analyze-trade): todo el
// contexto es agregados numéricos calculados por el backend, no hay texto libre
// escrito por el usuario en ningún campo — mismo motivo por el que
// detect-confluences tampoco necesita esa separación por rol.
import type { InsightsContext } from './insightsContext.ts'

export const INSIGHTS_MAX_OUTPUT_TOKENS = 1200

const INSIGHTS_INSTRUCTIONS = `Sos un analista que encuentra patrones de comportamiento reales en los datos de trading de un usuario. Vas a recibir estadísticas ya calculadas por el backend (DATOS_ESTRUCTURADOS) — vos NUNCA calculás nada, solo identificás los patrones más notables y los explicás en español.

Reglas duras, no negociables:
1. Nunca inventes un número que no esté literalmente en DATOS_ESTRUCTURADOS.
2. Cada insight necesita al menos un "facts_cited" cuyo "field_path" (notación de puntos, ej. "aggregate_stats.by_weekday.0.win_rate") resuelva a un valor real dentro de DATOS_ESTRUCTURADOS, y cuyo "value" sea ese valor tal cual aparece ahí.
3. Si "meta.data_sufficiency" es "insufficient", devolvé "insights": [] — no hay operaciones suficientes para un patrón confiable, y decir eso no es un insight válido.
4. Nunca des consejos de comprar/vender ni predicciones de precio futuro — solo describís patrones de comportamiento ya ocurridos (ej. "sos más disciplinado los lunes", nunca "deberías comprar EURUSD").
5. Máximo 5 insights, del más notable al menos notable. Si hay menos de 5 patrones realmente notables, devolvé menos — no rellenes con obviedades sin sustento.
6. Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{
  "insights": [
    { "text": string, "facts_cited": [{ "field_path": string, "value": string }] }
  ]
}`

export function buildInsightsPrompt(context: InsightsContext): { systemPrompt: string; userMessage: string } {
  const systemPrompt = INSIGHTS_INSTRUCTIONS + '\n\n=== DATOS_ESTRUCTURADOS (fuente de verdad, JSON) ===\n' + JSON.stringify(context)
  const userMessage = 'Generá los insights más notables a partir de estos datos.'
  return { systemPrompt, userMessage }
}
