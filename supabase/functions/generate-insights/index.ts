// generate-insights — Fase 4 del plan de confluencias/IA (Módulo 9 real del spec
// original: patrones descubiertos automáticamente cruzando TODO el historial, no un
// análisis de un trade a la vez como analyze-trade). Mismo esqueleto de seguridad que
// analyze-trade: userClient para leer las vistas agregadas (RLS decide qué puede ver),
// serviceClient solo para lo que requiere privilegio elevado (ai_provider_config,
// Vault, rate limit, insert en ai_insights). No recibe ningún ID en el body — el
// contexto es siempre "toda la cuenta del usuario autenticado".
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { buildInsightsContext } from '../_shared/insightsContext.ts'
import { buildInsightsPrompt, INSIGHTS_MAX_OUTPUT_TOKENS } from '../_shared/insightsPrompt.ts'
import { validateInsightsResponse } from '../_shared/insightsValidator.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'

type InsightsErrorCode = 'UNAUTHENTICATED' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: InsightsErrorCode, error: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Falta el header Authorization.')
  }

  const userClient = createUserClient(authHeader)
  const serviceClient = createServiceClient()

  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Sesión inválida o expirada.')
  }

  const { data: byokSettings } = await serviceClient
    .from('user_ai_settings')
    .select('use_own_key, byok_provider, byok_model, byok_secret_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const usingByok = Boolean(byokSettings?.use_own_key && byokSettings.byok_secret_id)
  const source: 'free_tier' | 'byok' = usingByok ? 'byok' : 'free_tier'

  let providerName: string
  let modelName: string
  let apiKey: string
  let maxOutputTokens = INSIGHTS_MAX_OUTPUT_TOKENS

  if (usingByok && byokSettings) {
    const decryptedSecret = await readVaultSecret(serviceClient, byokSettings.byok_secret_id as string)
    if (!decryptedSecret) {
      return errorResponse(500, 'PROVIDER_UNAVAILABLE', 'No se pudo leer la key BYOK configurada.')
    }
    providerName = byokSettings.byok_provider ?? 'groq'
    modelName = byokSettings.byok_model ?? 'openai/gpt-oss-20b'
    apiKey = decryptedSecret
  } else {
    const { data: providerConfig } = await serviceClient
      .from('ai_provider_config')
      .select('provider_name, model_name, max_tokens, provider_secret_id')
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle()

    if (!providerConfig || !providerConfig.provider_secret_id) {
      return errorResponse(503, 'PROVIDER_UNAVAILABLE', 'El proveedor de IA no está configurado todavía.')
    }
    const decryptedSecret = await readVaultSecret(serviceClient, providerConfig.provider_secret_id)
    if (!decryptedSecret) {
      return errorResponse(503, 'PROVIDER_UNAVAILABLE', 'No se pudo leer la key del proveedor por defecto.')
    }
    providerName = providerConfig.provider_name
    modelName = providerConfig.model_name
    maxOutputTokens = Math.min(providerConfig.max_tokens, INSIGHTS_MAX_OUTPUT_TOKENS)
    apiKey = decryptedSecret
  }

  let activeProvider
  try {
    activeProvider = resolveProvider(registry, providerName)
  } catch (err) {
    if (err instanceof UnregisteredProviderError) {
      return errorResponse(501, 'PROVIDER_UNAVAILABLE', err.message)
    }
    throw err
  }

  const context = await buildInsightsContext(userClient, user.id)
  const { systemPrompt, userMessage } = buildInsightsPrompt(context)

  let rateLimit
  try {
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, 1200, source)
  } catch (err) {
    return errorResponse(500, 'UNKNOWN', `No se pudo verificar el límite de uso: ${(err as Error).message}`)
  }
  if (!rateLimit.allowed) {
    return errorResponse(429, 'RATE_LIMIT', 'Alcanzaste tu límite de análisis gratuitos de hoy.')
  }

  let validation
  let lastRawText = ''
  let totalTokensUsed = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const effectiveSystemPrompt =
      attempt === 0
        ? systemPrompt
        : systemPrompt +
          '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido o citó un campo inexistente en facts_cited. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        { systemPrompt: effectiveSystemPrompt, userMessage, maxOutputTokens, model: modelName },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    lastRawText = providerResponse.rawText
    totalTokensUsed += providerResponse.tokensUsed
    validation = validateInsightsResponse(providerResponse.rawText, context)
    if (validation.valid) break
  }

  if (!validation?.valid || !validation.insights) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudieron generar los insights. Intenta de nuevo.')
  }

  const { error: insertError } = await serviceClient.from('ai_insights').insert({
    user_id: user.id,
    provider_name: providerName,
    model_name: modelName,
    context_snapshot: context as unknown as Record<string, unknown>,
    insights: validation.insights,
    tokens_used: totalTokensUsed,
  })

  if (insertError) {
    return errorResponse(500, 'UNKNOWN', `No se pudo guardar los insights: ${insertError.message}`)
  }

  return new Response(JSON.stringify({ insights: validation.insights, raw: lastRawText }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
