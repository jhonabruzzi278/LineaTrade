import { supabase } from './supabase'

// Clave pública VAPID — segura de exponer en el cliente (es la mitad pública
// del par; la privada vive solo como secret de la Edge Function
// send-trade-reminders, nunca en el bundle).
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

// pushManager.subscribe espera applicationServerKey como Uint8Array; las
// VAPID keys vienen en base64url. No hay conversión nativa — es el
// boilerplate estándar de la Push API.
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Pide el permiso NATIVO del sistema operativo/navegador — sin modal propio
 * previo, a pedido explícito del producto. Si el permiso ya fue decidido
 * antes (granted/denied), Notification.requestPermission() ni siquiera
 * vuelve a mostrar el prompt (lo garantiza el propio browser), así que no
 * hace falta guardar un flag "ya preguntamos" aparte.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

/** Crea (o reutiliza) la suscripción push del navegador y la guarda en push_subscriptions. */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!p256dh || !auth) return

  // onConflict: 'endpoint', no user_id — el mismo navegador puede rotar de
  // usuario (logout/login) sin acumular filas muertas del endpoint anterior.
  await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, endpoint: subscription.endpoint, p256dh, auth }, { onConflict: 'endpoint' })
}

// ── Recordatorio diario: control explícito desde Perfil ────────────────────
// El permiso nativo sigue pidiéndose solo al iniciar sesión
// (NotificationPermissionPrompt). Estas funciones dan el interruptor de
// «Recordatorio diario»: si el usuario lo apaga, se guarda una marca local por
// usuario para que el prompt automático no lo vuelva a suscribir en la
// siguiente sesión (el permiso del navegador sigue concedido).

function optOutKey(userId: string): string {
  return `lineatrade:push-optout:${userId}`
}

export function isPushOptedOut(userId: string): boolean {
  try {
    return localStorage.getItem(optOutKey(userId)) === '1'
  } catch {
    return false
  }
}

function setPushOptOut(userId: string, optedOut: boolean): void {
  try {
    if (optedOut) localStorage.setItem(optOutKey(userId), '1')
    else localStorage.removeItem(optOutKey(userId))
  } catch {
    // Sin almacenamiento: la preferencia dura solo esta sesión.
  }
}

export type DailyReminderState = 'on' | 'off' | 'blocked' | 'unsupported'

/** Estado real del recordatorio en este dispositivo. */
export async function getDailyReminderState(userId: string): Promise<DailyReminderState> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  if (Notification.permission !== 'granted' || isPushOptedOut(userId)) return 'off'
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription ? 'on' : 'off'
}

/** Enciende el recordatorio: pide permiso si hace falta y suscribe el dispositivo. */
export async function enableDailyReminder(userId: string): Promise<DailyReminderState> {
  if (!isPushSupported()) return 'unsupported'
  setPushOptOut(userId, false)
  const permission = await requestNotificationPermission()
  if (permission === 'denied') return 'blocked'
  if (permission !== 'granted') return 'off'
  await subscribeToPush(userId)
  return getDailyReminderState(userId)
}

/** Apaga el recordatorio: borra la suscripción de este dispositivo en el servidor y en el navegador. */
export async function disableDailyReminder(userId: string): Promise<void> {
  setPushOptOut(userId, true)
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', subscription.endpoint)
  await subscription.unsubscribe()
}
