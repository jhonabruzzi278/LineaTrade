// resolve-scanner-query — "filtro en lenguaje natural" con vocabulario cerrado.
// User-initiated: el usuario escribe texto descriptivo ("RSI menor a 30 y volumen
// 2x el promedio") y la IA lo traduce a condiciones estructuradas, que el frontend
// aplica client-side sobre scanner_results ya cargado. La función NUNCA ejecuta la
// consulta ni devuelve resultados — solo traduce, el frontend filtra. Cumple el
// principio ya establecido: "la IA nunca inventa, solo traduce".
//
// Comparte el mismo pool ai_usage_daily que toda otra función de IA del proyecto
// (3/día gratis o BYOK ilimitado).
import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { validateScannerQueryResponse, type ScannerQueryCondition } from '../_shared/scannerQueryValidator.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'

const requestBodySchema = z.object({ text: z.string().min(1).max(500) })

type QueryErrorCode = 'UNAUTHENTICATED' | 'BAD_REQUEST' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: QueryErrorCode, error: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const MAX_OUTPUT_TOKENS = 300

const SYSTEM_INSTRUCTIONS = `Sos un intérprete que traduce una consulta en lenguaje natural a condiciones de filtro estructuradas.
Solo podés usar campos del vocabulario cerrado que te paso en CAMPOS_PERMITIDOS.
Operadores permitidos: ">", "<", ">=", "<=", "=".

CAMPO_PERMITIDOS: price_change_pct, volume_spike_ratio, rsi_14, macd_line, macd_signal, macd_histogram, bollinger_percent_b, last_price

Si la consulta menciona una condición que no se puede traducir a un campo real, directamente la omitís (no intentes aproximar).
Si la consulta no tiene NINGUNA condición traducible, respondé con condiciones: [].

Respondé ÚNICAMENTE con este JSON, sin texto antes ni después:
{ "conditions": [{ "field": string, "operator": ">"|"<"|">="|"<="|"=", "value": number }] }`

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Falta el header Authorization.')
  }

  let text: string
  try {
    const body = await req.json()
    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'BAD_REQUEST', 'text inválido o ausente (máx. 500 caracteres).')
    }
    text = parsed.data.text
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

  const systemPrompt = SYSTEM_INSTRUCTIONS
  const userMessage = `Traducí a condiciones estructuradas: "${text}"`

  let validation: { valid: true; conditions: ScannerQueryCondition[] } | { valid: false; reason: string } | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const effectiveSystemPrompt =
      attempt === 0
        ? systemPrompt
        : systemPrompt +
          '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido o usó un campo fuera del vocabulario. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        { systemPrompt: effectiveSystemPrompt, userMessage, maxOutputTokens: MAX_OUTPUT_TOKENS, model: modelName },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    validation = validateScannerQueryResponse(providerResponse.rawText)
    if (validation.valid) break
  }

  if (!validation?.valid) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudo interpretar la consulta. Probá con palabras más directas.')
  }

  return new Response(JSON.stringify({ conditions: validation.conditions }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
