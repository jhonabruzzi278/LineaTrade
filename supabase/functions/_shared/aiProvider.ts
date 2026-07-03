// Fase 3 (Motor de IA) — interfaz mínima multi-proveedor (PRD §3.2). Solo Groq
// tiene una implementación real en esta fase; el resto de los proveedores
// listados en el PRD (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter) quedan
// sin registrar a propósito — un provider_name no registrado debe fallar con
// un error claro, nunca con un stub silencioso que finja funcionar.

export interface AIProviderRequest {
  systemPrompt: string
  userMessage: string
  maxOutputTokens: number
  model: string
}

export interface AIProviderResponse {
  rawText: string
  tokensUsed: number
}

export interface AIProvider {
  complete(req: AIProviderRequest, apiKey: string): Promise<AIProviderResponse>
}

export class UnregisteredProviderError extends Error {
  constructor(public readonly providerName: string) {
    super(`El proveedor "${providerName}" no está implementado en Fase 3.`)
    this.name = 'UnregisteredProviderError'
  }
}

export function createProviderRegistry(): Map<string, AIProvider> {
  return new Map<string, AIProvider>()
}

export function resolveProvider(registry: Map<string, AIProvider>, providerName: string): AIProvider {
  const provider = registry.get(providerName)
  if (!provider) throw new UnregisteredProviderError(providerName)
  return provider
}
