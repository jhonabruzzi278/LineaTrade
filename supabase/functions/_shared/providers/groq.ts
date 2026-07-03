// Fase 3 (Motor de IA) — única implementación real de AIProvider para esta
// fase (PRD §3.1: tier gratuito = GPT OSS 20B vía Groq). Groq expone un
// endpoint compatible con la API de chat completions de OpenAI.
//
// Nota: no se pasa `response_format: { type: 'json_object' }` — no está
// confirmado que el modelo configurado en ai_provider_config lo soporte, y
// forzarlo sin confirmar podría romper la request con un 400. La validación
// de que la salida sea el JSON esperado la hace responseValidator.ts (schema +
// retry-once), no un parámetro de la API. Si en el futuro se confirma soporte
// para el modelo activo, agregarlo acá es un endurecimiento adicional, no un
// reemplazo de esa validación.
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../aiProvider.ts'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'

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
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: req.userMessage },
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
