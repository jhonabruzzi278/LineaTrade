// detect-confluences — Fase 3 del plan de confluencias. NO detecta nada por sí sola:
// recibe candidatos ya calculados matemáticamente por src/lib/confluenceDetection.ts
// (FVG/Order Block/BOS/CHoCH/Liquidez, coordenadas de tiempo/precio reales) y la IA
// solo decide cuáles mostrar (filtra ruido) y agrega una explicación de una frase —
// nunca inventa una coordenada nueva. Mismo principio "el backend calcula, la IA
// interpreta" que ya rige analyze-trade, aplicado acá a un problema geométrico en vez
// de estadístico: pedirle a un LLM que calcule tiempo/precio de un patrón de velas es
// una tarea en la que son poco fiables; pedirle que priorice/explique candidatos ya
// calculados es exactamente el tipo de tarea de interpretación en la que sí rinden.
//
// Comparte el mismo cupo diario que analyze-trade/extract-trade-image
// (ai_usage_daily, source 'free_tier'|'byok') — es el mismo presupuesto de "llamadas a
// IA" del producto, no uno aparte por feature.
import { z } from 'npm:zod@3'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { validateConfluenceDetectionResponse } from '../_shared/confluenceDetectionValidator.ts'
import { CONFLUENCE_DETECTION_SYSTEM_PROMPT, CONFLUENCE_DETECTION_MAX_OUTPUT_TOKENS } from '../_shared/confluenceDetectionPrompt.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'

const candidateSchema = z.object({
  key: z.string(),
  confluence_name: z.string(),
  time_start: z.number(),
  price_start: z.number(),
  rationale: z.string(),
})
const requestBodySchema = z.object({
  symbol: z.string(),
  timeframe: z.string(),
  candidates: z.array(candidateSchema).min(1).max(60),
})

type DetectErrorCode = 'UNAUTHENTICATED' | 'BAD_REQUEST' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: DetectErrorCode, error: string) {
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

  let candidates: z.infer<typeof candidateSchema>[]
  try {
    const body = await req.json()
    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'BAD_REQUEST', 'Body inválido — se esperaba symbol, timeframe y candidates.')
    }
    candidates = parsed.data.candidates
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
  let maxOutputTokens = CONFLUENCE_DETECTION_MAX_OUTPUT_TOKENS

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
    maxOutputTokens = Math.min(providerConfig.max_tokens, CONFLUENCE_DETECTION_MAX_OUTPUT_TOKENS)
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
    // Estimado fijo de tokens de entrada (igual que extract-trade-image) — la lista de
    // candidatos varía de tamaño, pero esto es solo para el ledger de uso, no un gate.
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, 1000, source)
  } catch (err) {
    return errorResponse(500, 'UNKNOWN', `No se pudo verificar el límite de uso: ${(err as Error).message}`)
  }
  if (!rateLimit.allowed) {
    return errorResponse(429, 'RATE_LIMIT', 'Alcanzaste tu límite de análisis gratuitos de hoy.')
  }

  const validKeys = new Set(candidates.map((c) => c.key))
  const userMessage = JSON.stringify({
    candidates: candidates.map((c) => ({
      key: c.key,
      confluence_name: c.confluence_name,
      rationale: c.rationale,
    })),
  })

  let validation
  for (let attempt = 0; attempt < 2; attempt++) {
    const effectiveSystemPrompt =
      attempt === 0
        ? CONFLUENCE_DETECTION_SYSTEM_PROMPT
        : CONFLUENCE_DETECTION_SYSTEM_PROMPT +
          '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        { systemPrompt: effectiveSystemPrompt, userMessage, maxOutputTokens, model: modelName },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    validation = validateConfluenceDetectionResponse(providerResponse.rawText, validKeys)
    if (validation.valid) break
  }

  if (!validation?.valid || !validation.evaluations) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudo evaluar las confluencias. Intenta de nuevo.')
  }

  return new Response(JSON.stringify({ evaluations: validation.evaluations }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
