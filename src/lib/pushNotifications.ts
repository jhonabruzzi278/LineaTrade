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
