// Fase 3 (Motor de IA) — Edge Function analyze-trade. Ver plan de Fase 3
// (docs/trade-journal-os-context-engine.md + polymorphic-toasting-harp.md)
// para el diseño completo. Resumen del flujo de seguridad:
//
// 1. userClient (JWT del caller) hace el fetch del trade — RLS decide
//    ownership, nunca un chequeo manual de "if (trade.user_id !== caller)".
// 2. serviceClient (service_role) solo para lo que requiere privilegio
//    elevado: leer ai_provider_config/user_ai_settings, decriptar de Vault,
//    el rate-limit atómico, e insertar en ai_analysis.
// 3. El body de la request SOLO acepta trade_id — provider/model/system
//    prompt nunca vienen del cliente.
// 4. Nada se persiste si la validación de la salida del LLM falla dos veces.
import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { buildAIContext } from '../_shared/contextBuilder.ts'
import { buildPrompt, FREE_TIER_MAX_OUTPUT_TOKENS } from '../_shared/promptBuilder.ts'
import { validateAIResponse } from '../_shared/responseValidator.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'
import type { AnalyzeTradeErrorBody, AnalyzeTradeErrorCode } from '../_shared/types.ts'

const requestBodySchema = z.object({ trade_id: z.string().uuid() })

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  // Solo para dev/CI local — nunca se activa a menos que la env var esté
  // explícitamente en 'true' (no existe en producción).
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: AnalyzeTradeErrorCode, error: string, extra?: Record<string, number>) {
  const body: AnalyzeTradeErrorBody = { error, code, ...extra }
  return new Response(JSON.stringify(body), {
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

  let tradeId: string
  try {
    const body = await req.json()
    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'BAD_REQUEST', 'trade_id inválido o ausente.')
    }
    tradeId = parsed.data.trade_id
  } catch {
    return errorResponse(400, 'BAD_REQUEST', 'Body inválido, se esperaba JSON.')
  }

  const userClient = createUserClient(authHeader)
  const serviceClient = createServiceClient()

  const {
    data: { user },
  } = await userClient.auth.getUser()
  if (!user) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Sesión inválida o expirada.')
  }

  // RLS (trades_owner_all) es lo que realmente decide esto — si el trade es
  // de otro usuario, esta query devuelve 0 filas, no un error. Respondemos
  // 404 siempre, nunca un 403 con detalle: no le damos a nadie una forma de
  // confirmar que un trade_id ajeno existe.
  const { data: trade, error: tradeError } = await userClient
    .from('trades')
    .select('*, instruments(*)')
    .eq('id', tradeId)
    .maybeSingle()

  if (tradeError || !trade || !trade.instruments) {
    return errorResponse(404, 'NOT_FOUND', 'Trade no encontrado.')
  }

  // Resolver BYOK vs. tier gratuito. user_ai_settings ya no tiene grant de
  // select para "authenticated" (migración ai_byok_key_vault) — se lee vía
  // serviceClient, que sí tiene el grant explícito (migración
  // grant_service_role_ai_access).
  const { data: byokSettings } = await serviceClient
    .from('user_ai_settings')
    .select('use_own_key, byok_provider, byok_secret_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const usingByok = Boolean(byokSettings?.use_own_key && byokSettings.byok_secret_id)
  const source: 'free_tier' | 'byok' = usingByok ? 'byok' : 'free_tier'

  // Resolver provider + api key. Nunca desde el body del request.
  let providerName: string
  let modelName: string
  let apiKey: string
  let maxOutputTokens = FREE_TIER_MAX_OUTPUT_TOKENS

  if (usingByok && byokSettings) {
    const decryptedSecret = await readVaultSecret(serviceClient, byokSettings.byok_secret_id as string)
    if (!decryptedSecret) {
      return errorResponse(500, 'PROVIDER_UNAVAILABLE', 'No se pudo leer la key BYOK configurada.')
    }
    providerName = byokSettings.byok_provider ?? 'groq'
    modelName = 'openai/gpt-oss-20b' // BYOK todavía usa el mismo modelo por defecto en Fase 3; el selector de modelo BYOK queda fuera de alcance.
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
    maxOutputTokens = Math.min(providerConfig.max_tokens, FREE_TIER_MAX_OUTPUT_TOKENS)
    apiKey = decryptedSecret
  }

  let provider
  try {
    provider = resolveProvider(registry, providerName)
  } catch (err) {
    if (err instanceof UnregisteredProviderError) {
      return errorResponse(501, 'PROVIDER_UNAVAILABLE', err.message)
    }
    throw err
  }

  // Prompt activo — ai_prompts sí tiene select para cualquier authenticated
  // (son instrucciones versionadas, no secretas).
  const { data: promptRow } = await userClient
    .from('ai_prompts')
    .select('id, version, content')
    .eq('name', 'trade_analysis')
    .eq('is_active', true)
    .maybeSingle()

  if (!promptRow) {
    return errorResponse(500, 'UNKNOWN', 'No hay un prompt activo configurado.')
  }

  const context = await buildAIContext(userClient, trade, trade.instruments, promptRow.version)
  const { systemPrompt, userMessage, estimatedInputTokens } = buildPrompt(context, promptRow.content)

  // Reservar el cupo ANTES de llamar al LLM — si el proveedor falla después,
  // es un costo de UX, no un bypass de seguridad (ver plan, sección 2). Se
  // pasa el conteo real de tokens de entrada (ya calculado localmente, sin
  // llamar al proveedor) para que el ledger de costos (PRD §3.7) sea preciso,
  // no solo el gate de cantidad de requests.
  let rateLimit
  try {
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, estimatedInputTokens, source)
  } catch (err) {
    return errorResponse(500, 'UNKNOWN', `No se pudo verificar el límite de uso: ${(err as Error).message}`)
  }
  if (!rateLimit.allowed) {
    return errorResponse(429, 'RATE_LIMIT', 'Alcanzaste tu límite de análisis gratuitos de hoy.', {
      requests_count: rateLimit.requestsCount,
      daily_limit: 3,
    })
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
      providerResponse = await provider.complete(
        { systemPrompt: effectiveSystemPrompt, userMessage, maxOutputTokens, model: modelName },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    lastRawText = providerResponse.rawText
    totalTokensUsed += providerResponse.tokensUsed
    validation = validateAIResponse(providerResponse.rawText, context)
    if (validation.valid) break
  }

  if (!validation?.valid || !validation.parsed) {
    // No se persiste nada — una respuesta no validada no puede quedar en
    // ai_analysis, todo el valor del producto depende de que lo que se
    // guarda ahí sea confiable.
    return errorResponse(502, 'VALIDATION_FAILED', 'El análisis no pudo generarse correctamente. Intenta de nuevo.')
  }

  const { error: insertError } = await serviceClient.from('ai_analysis').insert({
    trade_id: trade.id,
    user_id: user.id,
    prompt_id: promptRow.id,
    provider_name: providerName,
    model_name: modelName,
    trade_snapshot_at_analysis: context.current_trade as unknown as Record<string, unknown>,
    response_text: lastRawText,
    tokens_used: totalTokensUsed,
  })

  if (insertError) {
    return errorResponse(500, 'UNKNOWN', `No se pudo guardar el análisis: ${insertError.message}`)
  }

  return new Response(JSON.stringify(validation.parsed), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
