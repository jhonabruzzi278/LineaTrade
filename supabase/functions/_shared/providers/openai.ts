// Segunda implementación real de AIProvider (además de Groq) — habilita que
// ai_provider_config.provider_name = 'openai' funcione de verdad, no solo
// exista en el schema. La API de Chat Completions de OpenAI comparte el
// mismo shape que Groq (que la imita) para mensajes y content multimodal
// (image_url + data URL base64), así que esta implementación es casi
// idéntica a groq.ts salvo el endpoint y un detalle real de la API de OpenAI:
// `max_tokens` está deprecado y no es compatible con los modelos de
// razonamiento (o1/o3/gpt-5 reasoning tier) — `max_completion_tokens` es el
// campo que funciona en todos los modelos actuales, así que se usa ese en vez
// de replicar el `max_tokens` de groq.ts.
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../aiProvider.ts'

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'

function buildUserContent(req: AIProviderRequest): string | Array<Record<string, unknown>> {
  if (!req.image) return req.userMessage
  return [
    { type: 'text', text: req.userMessage },
    { type: 'image_url', image_url: { url: `data:${req.image.mimeType};base64,${req.image.base64}` } },
  ]
}

export const openaiProvider: AIProvider = {
  async complete(req: AIProviderRequest, apiKey: string): Promise<AIProviderResponse> {
    const response = await fetch(OPENAI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        max_completion_tokens: req.maxOutputTokens,
        ...(req.forceJson ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: req.systemPrompt },
          { role: 'user', content: buildUserContent(req) },
        ],
      }),
    })

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '')
      throw new Error(`OpenAI respondió ${response.status}: ${bodyText.slice(0, 500)}`)
    }

    const data = await response.json()
    const rawText = data?.choices?.[0]?.message?.content
    if (typeof rawText !== 'string') {
      throw new Error('OpenAI no devolvió contenido de mensaje válido.')
    }

    const tokensUsed = typeof data?.usage?.total_tokens === 'number' ? data.usage.total_tokens : 0
    return { rawText, tokensUsed }
  },
}
