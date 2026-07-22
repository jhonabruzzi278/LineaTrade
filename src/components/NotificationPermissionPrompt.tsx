import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { isPushSupported, requestNotificationPermission, subscribeToPush } from '../lib/pushNotifications'

// No renderiza nada visible. Apenas hay una sesión activa, pide el permiso
// NATIVO de notificaciones (el del sistema operativo/navegador — sin modal
// propio previo, a pedido explícito del producto) y, si lo conceden,
// suscribe el dispositivo a push (ver lib/pushNotifications.ts). El
// recordatorio en sí lo manda send-trade-reminders 2x/día vía pg_cron.
//
// processedUserId (no un simple "ya preguntamos" booleano) para cubrir el
// caso de dos cuentas distintas en el mismo navegador sin recargar la
// página (logout → login como otro usuario): al cambiar el user.id se
// vuelve a correr subscribeToPush, que reasocia el endpoint de este
// dispositivo (upsert onConflict: 'endpoint') al nuevo usuario. No vuelve a
// mostrar el prompt nativo si el permiso ya fue decidido — eso ya lo
// garantiza el propio browser.
export function NotificationPermissionPrompt() {
  const { user } = useAuth()
  const processedUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!user || !isPushSupported() || processedUserId.current === user.id) return
    processedUserId.current = user.id

    async function askAndSubscribe() {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPush(user!.id)
      }
    }

    void askAndSubscribe()
  }, [user])

  return null
}
