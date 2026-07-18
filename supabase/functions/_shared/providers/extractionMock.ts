// extract-trade-image — proveedor mock, mismo propósito que providers/mock.ts
// (solo dev/CI local, activado únicamente con AI_MOCK_PROVIDER=true) pero con
// la forma de respuesta de extracción en vez de la de análisis — son schemas
// distintos, no tiene sentido compartir un solo mock entre las dos funciones.
// Permite probar todo el pipeline (auth, rate limit, validación, wiring del
// frontend) sin gastar cuota real de Groq ni necesitar que la imagen se lea
// de verdad.
import type { AIProvider, AIProviderRequest, AIProviderResponse } from '../aiProvider.ts'

export const extractionMockProvider: AIProvider = {
  async complete(req: AIProviderRequest, _apiKey: string): Promise<AIProviderResponse> {
    const response = {
      market: 'options',
      symbol: 'SPXW',
      action: 'long',
      option_type: 'put',
      strike_price: 6370,
      expiration_date: '2026-03-27',
      date: '2026-03-27',
      time: '09:31',
      quantity: 100,
      price: 5.38,
      commission: 51.4,
      order_number: '6407',
      order_placed_time: '09:31',
      price_type: 'market',
      limit_price: null,
      bid_price: 4.9,
      ask_price: 5.1,
      term: 'Good for Day',
      all_or_none: false,
    }
    return {
      rawText: JSON.stringify(response),
      tokensUsed: req.systemPrompt.length,
    }
  },
}
