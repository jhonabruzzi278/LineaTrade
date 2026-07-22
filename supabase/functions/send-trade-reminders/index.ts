// send-trade-reminders — invocada 2x/día vía pg_cron (ver
// 20260722110000_trade_reminder_cron_jobs.sql) para preguntarle a cada
// usuario con push habilitado "¿ya registraste tu trade de hoy?". Mismo
// esqueleto que fetch-news (CORS estático, auth por X-Cron-Secret,
// serviceClient para bypassear RLS a propósito), pero a diferencia de
// fetch-news esta función SOLO la invoca el cron interno — no hay caso de
// uso donde el cliente la llame directo, así que no hay rama de
// Authorization/sesión de usuario.
//
// "Ya registró su trade de hoy" se evalúa en el día calendario UTC, no en el
// timezone del usuario (profiles no modela timezone todavía). Simplificación
// conocida y documentada, mismo criterio que el desfasaje DST ya aceptado en
// el cron de noticias — no vale la pena modelar timezone por usuario solo
// para este recordatorio.
import webpush from 'npm:web-push@3.6.7'
import { corsHeaders } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClients.ts'

const REMINDER_TITLE = 'LineaTrade'
const REMINDER_BODY = '¿Ya registraste tu trade de hoy? Tu bitácora te espera.'
const DEFAULT_VAPID_SUBJECT = 'mailto:soporte@lineartrade.app'

function errorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function utcDayStartIso(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString()
}

function isGoneStatus(err: unknown): boolean {
  const statusCode = (err as { statusCode?: number } | null)?.statusCode
  return statusCode === 404 || statusCode === 410
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Auth: solo cron interno via X-Cron-Secret — nunca una sesión de usuario.
  const cronSecret = Deno.env.get('TRADE_REMINDER_CRON_SECRET')
  const providedCronSecret = req.headers.get('X-Cron-Secret')
  const isCronInternal = !!(cronSecret && providedCronSecret && providedCronSecret === cronSecret)
  if (!isCronInternal) {
    return errorResponse(401, 'Esta función solo la invoca el cron interno.')
  }

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublicKey || !vapidPrivateKey) {
    return errorResponse(500, 'Faltan las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY.')
  }
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? DEFAULT_VAPID_SUBJECT
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const serviceClient = createServiceClient()

  const { data: subscriptions, error: subsError } = await serviceClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')

  if (subsError) {
    return errorResponse(500, `No se pudo leer push_subscriptions: ${subsError.message}`)
  }
  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, skipped: 0, removed: 0 }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Quiénes ya registraron un trade hoy (UTC) no reciben el recordatorio.
  const userIds = [...new Set(subscriptions.map((s) => s.user_id))]
  const { data: todaysTrades, error: tradesError } = await serviceClient
    .from('trades')
    .select('user_id')
    .in('user_id', userIds)
    .is('deleted_at', null)
    .gte('traded_at', utcDayStartIso())

  if (tradesError) {
    return errorResponse(500, `No se pudo leer trades: ${tradesError.message}`)
  }

  const usersWithTradeToday = new Set((todaysTrades ?? []).map((t) => t.user_id))
  const targetSubscriptions = subscriptions.filter((s) => !usersWithTradeToday.has(s.user_id))

  const payload = JSON.stringify({
    title: REMINDER_TITLE,
    body: REMINDER_BODY,
    url: '/nuevo-trade',
  })

  let sent = 0
  const staleIds: string[] = []

  await Promise.allSettled(
    targetSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        )
        sent += 1
      } catch (err) {
        // 404/410 = el push service ya no reconoce el endpoint (navegador
        // desinstalado, permiso revocado a mano, etc.) — limpiamos la fila.
        // Cualquier otro error (red, VAPID mal configurado) lo dejamos vivo
        // para reintentar en el próximo cron en vez de borrar por las dudas.
        if (isGoneStatus(err)) staleIds.push(sub.id)
      }
    }),
  )

  let removed = 0
  if (staleIds.length > 0) {
    const { error: deleteError } = await serviceClient.from('push_subscriptions').delete().in('id', staleIds)
    if (!deleteError) removed = staleIds.length
  }

  return new Response(
    JSON.stringify({ sent, skipped: subscriptions.length - targetSubscriptions.length, removed }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
