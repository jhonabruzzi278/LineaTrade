// extract-trade-image — lee una foto/captura de la confirmación de orden de
// un bróker y devuelve los campos que pudo extraer, para pre-llenar el
// formulario de Nuevo Trade. Nunca guarda nada en la base — el usuario revisa
// y confirma en el formulario normal antes de que se inserte cualquier fila
// en trades. Reusa el mismo contador de uso diario (ai_usage_daily) que
// analyze-trade: es el mismo presupuesto de "llamadas a IA", no uno aparte.
//
// Solo Groq (qwen/qwen3.6-27b, el único modelo con visión que expone Groq hoy
// — ver console.groq.com/docs/vision) tiene implementación real, igual que
// analyze-trade. El modelo queda hardcodeado en extractionPrompt.ts en vez de
// leerse de ai_provider_config: la key de Groq no es por modelo, así que no
// hace falta una fila de config nueva para esto.
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { validateExtractionResponse } from '../_shared/extractionValidator.ts'
import {
  EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_USER_MESSAGE,
  EXTRACTION_MODEL,
  EXTRACTION_MAX_OUTPUT_TOKENS,
} from '../_shared/extractionPrompt.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { extractionMockProvider } from '../_shared/providers/extractionMock.ts'
import type { AIProvider } from '../_shared/aiProvider.ts'

// Mismo interruptor que analyze-trade — solo se activa si AI_MOCK_PROVIDER
// está explícitamente en 'true' (nunca en producción, no está seteado ahí).
const activeProvider: AIProvider = Deno.env.get('AI_MOCK_PROVIDER') === 'true' ? extractionMockProvider : groqProvider

type ExtractErrorCode = 'UNAUTHENTICATED' | 'BAD_REQUEST' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const MAX_IMAGE_BASE64_CHARS = 7_000_000 // ~5MB de imagen original tras el ~33% de inflación de base64
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
// No hay un conteo real de tokens de entrada antes de llamar (a diferencia de
// analyze-trade, que arma el contexto localmente) — una imagen no tiene un
// tamaño de tokens previsible sin llamar al proveedor. Este es un estimado
// fijo solo para el ledger de uso (PRD §3.7), no un gate de seguridad.
const ESTIMATED_INPUT_TOKENS = 1500

function errorResponse(status: number, code: ExtractErrorCode, error: string) {
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

  let imageBase64: string
  let imageMimeType: string
  try {
    const body = await req.json()
    if (typeof body?.image_base64 !== 'string' || typeof body?.image_mime_type !== 'string') {
      return errorResponse(400, 'BAD_REQUEST', 'image_base64 e image_mime_type son obligatorios.')
    }
    if (!ALLOWED_MIME_TYPES.includes(body.image_mime_type)) {
      return errorResponse(400, 'BAD_REQUEST', 'Formato de imagen no soportado — usá JPG, PNG o WebP.')
    }
    if (body.image_base64.length > MAX_IMAGE_BASE64_CHARS) {
      return errorResponse(400, 'BAD_REQUEST', 'La imagen es demasiado grande — probá con una de menos de 5MB.')
    }
    imageBase64 = body.image_base64
    imageMimeType = body.image_mime_type
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
    .select('use_own_key, byok_provider, byok_secret_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const usingByok = Boolean(byokSettings?.use_own_key && byokSettings.byok_secret_id && byokSettings.byok_provider === 'groq')
  const source: 'free_tier' | 'byok' = usingByok ? 'byok' : 'free_tier'

  let apiKey: string
  if (usingByok && byokSettings) {
    const decryptedSecret = await readVaultSecret(serviceClient, byokSettings.byok_secret_id as string)
    if (!decryptedSecret) {
      return errorResponse(500, 'PROVIDER_UNAVAILABLE', 'No se pudo leer la key BYOK configurada.')
    }
    apiKey = decryptedSecret
  } else {
    const { data: providerConfig } = await serviceClient
      .from('ai_provider_config')
      .select('provider_secret_id')
      .eq('provider_name', 'groq')
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
    apiKey = decryptedSecret
  }

  let rateLimit
  try {
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, ESTIMATED_INPUT_TOKENS, source)
  } catch (err) {
    return errorResponse(500, 'UNKNOWN', `No se pudo verificar el límite de uso: ${(err as Error).message}`)
  }
  if (!rateLimit.allowed) {
    return errorResponse(429, 'RATE_LIMIT', 'Alcanzaste tu límite de análisis gratuitos de hoy.')
  }

  let validation
  for (let attempt = 0; attempt < 2; attempt++) {
    const effectiveSystemPrompt =
      attempt === 0
        ? EXTRACTION_SYSTEM_PROMPT
        : EXTRACTION_SYSTEM_PROMPT + '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        {
          systemPrompt: effectiveSystemPrompt,
          userMessage: EXTRACTION_USER_MESSAGE,
          maxOutputTokens: EXTRACTION_MAX_OUTPUT_TOKENS,
          model: EXTRACTION_MODEL,
          image: { base64: imageBase64, mimeType: imageMimeType },
          forceJson: true,
        },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    validation = validateExtractionResponse(providerResponse.rawText)
    if (validation.valid) break
  }

  if (!validation?.valid || !validation.parsed) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudo leer la imagen correctamente. Probá con una foto más nítida.')
  }

  return new Response(JSON.stringify(validation.parsed), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
