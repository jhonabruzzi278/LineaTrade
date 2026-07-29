// Fase 3 (Motor de IA) — única implementación real de AIProvider para esta
// fase (PRD §3.1: tier gratuito = GPT OSS 20B vía Groq). Groq expone un
// endpoint compatible con la API de chat completions de OpenAI.
//
// Nota: `response_format: json_object` solo se manda si el caller pasa
// forceJson=true (opt-in) — para gpt-oss-20b (analyze-trade) no está
// confirmado que lo soporte, y forzarlo sin confirmar podría romper la
// request con un 400. La validación de que la salida sea el JSON esperado la
// hace responseValidator.ts (schema + retry-once) para ese caso, no un
// parámetro de la API. qwen3.6-27b (extract-trade-image) sí lo tiene
// documentado como soportado — ver console.groq.com/docs/vision — así que ahí
// se pasa forceJson=true como endurecimiento extra sobre la misma validación.
//
// Bug real encontrado probando contra la API de verdad (no en el schema doc,
// no reproducible con datos fabricados simples): gpt-oss-20b es un modelo de
// razonamiento — gasta una porción variable e impredecible de max_tokens en un
// campo "reasoning" oculto ANTES de escribir "content". Con el prompt real
// (reglas + DATOS_ESTRUCTURADOS), a veces el razonamiento consumía el budget
// de maxOutputTokens entero y "content" llegaba vacío — JSON.parse('') tira
// "Unexpected end of JSON input", responseValidator lo marca inválido. Pasó
// en ~1 de cada 3-4 llamadas reales en pruebas manuales. `reasoning_effort:
// 'low'` (soportado por Groq para la familia gpt-oss) acota ese gasto de forma
// consistente (~30-90 tokens en vez de un rango sin techo aparente) — 6/6
// llamadas de prueba con el prompt real produjeron content no vacío después
// del cambio. Solo se aplica a modelos gpt-oss; otros modelos que Groq pueda
// alojar en el futuro no necesariamente soportan este parámetro.
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../aiProvider.ts'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const REASONING_MODEL_PATTERN = /gpt-oss/i

// Con imagen, el content del mensaje "user" pasa de string plano al formato
// multimodal de la API de chat completions (array de partes text/image_url,
// imagen como data URL base64) — mismo shape que usa OpenAI/Anthropic/etc.
// para vision, Groq lo espeja igual.
function buildUserContent(req: AIProviderRequest): string | Array<Record<string, unknown>> {
  if (!req.image) return req.userMessage
  return [
    { type: 'text', text: req.userMessage },
    { type: 'image_url', image_url: { url: `data:${req.image.mimeType};base64,${req.image.base64}` } },
  ]
}

export const groqProvider: AIProvider = {
  async complete(req: AIProviderRequest, apiKey: string): Promise<AIProviderResponse> {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxOutputTokens,
        ...(REASONING_MODEL_PATTERN.test(req.model) ? { reasoning_effort: 'low' } : {}),
        ...(req.forceJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: req.systemPrompt },
          ...(req.history ?? []).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: buildUserContent(req) },
        ],
      }),
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`Groq respondió ${response.status}: ${bodyText.slice(0, 500)}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content
    if (typeof rawText !== 'string') {
      throw new Error('Groq no devolvió contenido de mensaje válido.')
    }

    const tokensUsed = typeof data?.usage?.total_tokens === 'number' ? data.usage.total_tokens : 0
    return { rawText, tokensUsed }
  },
}
