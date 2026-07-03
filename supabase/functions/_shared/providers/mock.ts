// Fase 3 (Motor de IA) — proveedor mock, solo para dev/CI local. Se registra
// únicamente si Deno.env.get('AI_MOCK_PROVIDER') === 'true' (ver index.ts) —
// nunca en producción, no queda disponible a menos que se active explícitamente
// la variable de entorno. Permite probar todo el pipeline (auth, rate limit,
// contexto, validación, escritura en ai_analysis) sin gastar cuota real de Groq.
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../aiProvider.ts'

export const mockProvider: AIProvider = {
  async complete(req: AIProviderRequest, _apiKey: string): Promise<AIProviderResponse> {
    // Devuelve un facts_cited fabricado a propósito con datos reales extraídos
    // del propio userMessage/systemPrompt cuando es posible, para que las
    // pruebas de validación (responseValidator) tengan algo determinístico
    // contra qué chequear. Si no puede extraer nada, cae a un cuerpo mínimo
    // válido pero con facts_cited vacío (data_sufficiency 'insufficient').
    const response = {
      data_sufficiency: 'insufficient' as const,
      facts_cited: [],
      interpretation:
        'No hay suficientes operaciones registradas para identificar un patrón confiable (respuesta simulada del MockProvider).',
      observation: null,
      behavioral_suggestion: null,
    }
    return {
      rawText: JSON.stringify(response),
      tokensUsed: req.systemPrompt.length + req.userMessage.length,
    }
  },
}
