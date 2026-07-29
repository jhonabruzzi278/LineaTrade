// explain-scan-result — prompt fijo. Diseño revisado respecto al plan original: NO es
// una extensión de run-scanner que explica los ~150 símbolos en cada corrida del cron
// (eso costaría 150 llamadas de IA cada 5 minutos, incompatible con el cupo de "3
// análisis gratuitos/día" que ya rige el resto del producto) — es user-initiated,
// igual que "Analizar con IA" en un trade: el usuario filtra el escáner en el
// frontend y pide una explicación puntual para UN símbolo que le interesa.
export const SCANNER_EXPLAIN_MAX_OUTPUT_TOKENS = 400

const SCANNER_EXPLAIN_INSTRUCTIONS = `Sos un asistente que explica en una frase por qué un símbolo del escáner de mercado podría ser interesante ahora mismo, basándote ÚNICAMENTE en los indicadores ya calculados que te paso en DATOS_ESTRUCTURADOS — vos no los calculás, ya vienen calculados por el backend.

Reglas duras, no negociables:
1. Nunca inventes un número — solo podés citar los que aparecen literalmente en DATOS_ESTRUCTURADOS.
2. "facts_cited" necesita al menos un elemento cuyo "field_path" (notación de puntos, ej. "rsi_14") resuelva a un valor real dentro de DATOS_ESTRUCTURADOS.
3. Nunca digas "comprá"/"vendé" ni prediscas hacia dónde va el precio — solo describí qué está mostrando el indicador ahora mismo (ej. "RSI en zona de sobreventa", "volumen muy por encima del promedio reciente").
4. Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{ "explanation": string, "facts_cited": [{ "field_path": string, "value": string }] }`

export interface ScannerExplainContext {
  symbol: string
  price_change_pct: number | null
  volume_spike_ratio: number | null
  rsi_14: number | null
  macd_line: number | null
  macd_signal: number | null
  macd_histogram: number | null
  bollinger_percent_b: number | null
  last_price: number
}

export function buildScannerExplainPrompt(context: ScannerExplainContext): { systemPrompt: string; userMessage: string } {
  const systemPrompt = SCANNER_EXPLAIN_INSTRUCTIONS + '\n\n=== DATOS_ESTRUCTURADOS (fuente de verdad, JSON) ===\n' + JSON.stringify(context)
  const userMessage = `Explicá en una frase por qué ${context.symbol} podría ser interesante ahora mismo.`
  return { systemPrompt, userMessage }
}
