// explain-scan-result — Fase 5, capa de "alertas inteligentes" del escáner.
// User-initiated (no cron): el usuario filtra scanner_results en el frontend y pide
// una explicación puntual para UN símbolo — mismo esqueleto y mismo cupo diario
// compartido que analyze-trade/generate-insights/detect-confluences, nunca uno nuevo
// por feature. No persiste nada — a diferencia de ai_analysis/ai_insights, una
// explicación de indicadores de mercado queda vieja en minutos, no hay valor en
// guardarla para consultar después.
import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { buildScannerExplainPrompt, SCANNER_EXPLAIN_MAX_OUTPUT_TOKENS, type ScannerExplainContext } from '../_shared/scannerExplainPrompt.ts'
import { validateScannerExplainResponse } from '../_shared/scannerExplainValidator.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'

const requestBodySchema = z.object({ symbol: z.string().min(1) })

type ExplainErrorCode = 'UNAUTHENTICATED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: ExplainErrorCode, error: string) {
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

  let symbol: string
  try {
    const body = await req.json()
    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'BAD_REQUEST', 'symbol inválido o ausente.')
    }
    symbol = parsed.data.symbol
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

  // scanner_results es de lectura pública para cualquier authenticated (RLS) — el
  // userClient alcanza, no hace falta service_role para leerlo.
  const { data: scanResult, error: scanError } = await userClient
    .from('scanner_results')
    .select('symbol, price_change_pct, volume_spike_ratio, rsi_14, macd_line, macd_signal, macd_histogram, bollinger_percent_b, last_price')
    .eq('symbol', symbol)
    .maybeSingle()

  if (scanError || !scanResult) {
    return errorResponse(404, 'NOT_FOUND', 'No hay datos de escáner para ese símbolo todavía.')
  }

  const context: ScannerExplainContext = scanResult

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
  let maxOutputTokens = SCANNER_EXPLAIN_MAX_OUTPUT_TOKENS

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
    maxOutputTokens = Math.min(providerConfig.max_tokens, SCANNER_EXPLAIN_MAX_OUTPUT_TOKENS)
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

  let rateLimit
  try {
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, 400, source)
  } catch (err) {
    return errorResponse(500, 'UNKNOWN', `No se pudo verificar el límite de uso: ${(err as Error).message}`)
  }
  if (!rateLimit.allowed) {
    return errorResponse(429, 'RATE_LIMIT', 'Alcanzaste tu límite de análisis gratuitos de hoy.')
  }

  const { systemPrompt, userMessage } = buildScannerExplainPrompt(context)

  let validation
  for (let attempt = 0; attempt < 2; attempt++) {
    const effectiveSystemPrompt =
      attempt === 0
        ? systemPrompt
        : systemPrompt +
          '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido o citó un campo inexistente. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        { systemPrompt: effectiveSystemPrompt, userMessage, maxOutputTokens, model: modelName },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    validation = validateScannerExplainResponse(providerResponse.rawText, context)
    if (validation.valid) break
  }

  if (!validation?.valid) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudo generar la explicación. Intenta de nuevo.')
  }

  return new Response(JSON.stringify({ explanation: validation.explanation, facts_cited: validation.facts_cited }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
