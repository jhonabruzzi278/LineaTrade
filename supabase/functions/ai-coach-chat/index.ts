// ai-coach-chat — Fase 6, la pieza más nueva del plan (sin precedente de chat en este
// proyecto). El cliente inserta su propio mensaje (role='user') directamente vía RLS
// antes de llamar acá (ver src/lib/coach.ts) — esta función solo genera y valida la
// respuesta del asistente para la conversación ya existente, la inserta con
// service_role (mismo criterio insert-only que ai_analysis/ai_insights: ningún
// mensaje "de la IA" llega a la tabla sin pasar por la validación anti-alucinación).
//
// Multi-turno de verdad: a diferencia del resto del motor de IA (siempre un solo
// system+user por llamada), acá se arma un `history` con los turnos previos de la
// conversación (ver AIProviderRequest.history, extensión nueva de esta fase) —
// recortado por presupuesto de tokens con el mismo criterio ya establecido en
// promptBuilder.ts (recorta el turno más viejo primero).
import { z } from 'npm:zod@3'
import { encode } from 'npm:gpt-tokenizer@2'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient, createUserClient, readVaultSecret } from '../_shared/supabaseClients.ts'
import { checkAndIncrementUsage } from '../_shared/rateLimiter.ts'
import { buildInsightsContext } from '../_shared/insightsContext.ts'
import { buildCoachSystemPrompt, COACH_MAX_OUTPUT_TOKENS, COACH_HISTORY_TOKEN_BUDGET } from '../_shared/coachPrompt.ts'
import { validateCoachResponse } from '../_shared/coachValidator.ts'
import { createProviderRegistry, resolveProvider, UnregisteredProviderError, type AIProviderMessage } from '../_shared/aiProvider.ts'
import { groqProvider } from '../_shared/providers/groq.ts'
import { openaiProvider } from '../_shared/providers/openai.ts'
import { mockProvider } from '../_shared/providers/mock.ts'

const requestBodySchema = z.object({ conversation_id: z.string().uuid() })

type CoachErrorCode = 'UNAUTHENTICATED' | 'BAD_REQUEST' | 'NOT_FOUND' | 'RATE_LIMIT' | 'PROVIDER_UNAVAILABLE' | 'VALIDATION_FAILED' | 'UNKNOWN'

const registry = createProviderRegistry()
registry.set('groq', groqProvider)
registry.set('openai', openaiProvider)
if (Deno.env.get('AI_MOCK_PROVIDER') === 'true') {
  registry.set('groq', mockProvider)
  registry.set('openai', mockProvider)
}

function errorResponse(status: number, code: CoachErrorCode, error: string) {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function countTokens(text: string): number {
  return encode(text).length
}

// Recorta el turno más viejo primero hasta entrar en presupuesto — mismo criterio que
// buildPrompt() en promptBuilder.ts aplica a recent_trades_summary.
function trimHistory(history: AIProviderMessage[], budget: number): AIProviderMessage[] {
  const trimmed = [...history]
  let tokens = trimmed.reduce((sum, m) => sum + countTokens(m.content), 0)
  while (tokens > budget && trimmed.length > 0) {
    const removed = trimmed.shift()
    if (removed) tokens -= countTokens(removed.content)
  }
  return trimmed
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Falta el header Authorization.')
  }

  let conversationId: string
  try {
    const body = await req.json()
    const parsed = requestBodySchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse(400, 'BAD_REQUEST', 'conversation_id inválido o ausente.')
    }
    conversationId = parsed.data.conversation_id
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

  // RLS (ai_coach_conversations_owner_all) decide esto — si la conversación es de
  // otro usuario, 0 filas, nunca un 403 con detalle.
  const { data: conversation } = await userClient.from('ai_coach_conversations').select('id').eq('id', conversationId).maybeSingle()
  if (!conversation) {
    return errorResponse(404, 'NOT_FOUND', 'Conversación no encontrada.')
  }

  const { data: messages, error: messagesError } = await userClient
    .from('ai_coach_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (messagesError || !messages || messages.length === 0) {
    return errorResponse(400, 'BAD_REQUEST', 'La conversación no tiene mensajes todavía.')
  }

  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role !== 'user') {
    return errorResponse(400, 'BAD_REQUEST', 'El último mensaje de la conversación no es del usuario — nada que responder.')
  }

  const priorHistory: AIProviderMessage[] = messages.slice(0, -1).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))
  const trimmedHistory = trimHistory(priorHistory, COACH_HISTORY_TOKEN_BUDGET)

  const context = await buildInsightsContext(userClient, user.id)
  const systemPrompt = buildCoachSystemPrompt(context)

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
  let maxOutputTokens = COACH_MAX_OUTPUT_TOKENS

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
    maxOutputTokens = Math.min(providerConfig.max_tokens, COACH_MAX_OUTPUT_TOKENS)
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

  // Cada mensaje del usuario consume una unidad de cupo, mismo pool compartido que
  // analyze-trade/generate-insights/detect-confluences/explain-scan-result — no uno
  // nuevo por conversación ni por sesión (ai_usage_daily.source tiene un check
  // constraint fijo a 'free_tier'|'byok', no admite un tag nuevo por feature).
  let rateLimit
  try {
    rateLimit = await checkAndIncrementUsage(serviceClient, user.id, 800, source)
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
        ? systemPrompt
        : systemPrompt +
          '\n\nIMPORTANTE: tu respuesta anterior no fue JSON válido o citó un campo inexistente. Respondé ÚNICAMENTE con el JSON exacto del schema, sin texto adicional.'

    let providerResponse
    try {
      providerResponse = await activeProvider.complete(
        {
          systemPrompt: effectiveSystemPrompt,
          userMessage: lastMessage.content,
          maxOutputTokens,
          model: modelName,
          history: trimmedHistory,
        },
        apiKey,
      )
    } catch (err) {
      return errorResponse(502, 'PROVIDER_UNAVAILABLE', `El proveedor de IA falló: ${(err as Error).message}`)
    }

    validation = validateCoachResponse(providerResponse.rawText, context)
    if (validation.valid) break
  }

  if (!validation?.valid || validation.content === undefined) {
    return errorResponse(502, 'VALIDATION_FAILED', 'No se pudo generar una respuesta. Intenta de nuevo.')
  }

  const { data: insertedMessage, error: insertError } = await serviceClient
    .from('ai_coach_messages')
    .insert({
      conversation_id: conversationId,
      user_id: user.id,
      role: 'assistant',
      content: validation.content,
      facts_cited: validation.facts_cited ?? [],
    })
    .select('id, role, content, facts_cited, created_at')
    .single()

  if (insertError || !insertedMessage) {
    return errorResponse(500, 'UNKNOWN', `No se pudo guardar la respuesta: ${insertError?.message ?? 'error desconocido'}`)
  }

  await serviceClient.from('ai_coach_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

  return new Response(JSON.stringify({ message: insertedMessage }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
