// Manejo de Web Push para el recordatorio "¿ya registraste tu trade de hoy?"
// (ver supabase/functions/send-trade-reminders y su cron en
// supabase/migrations/20260722110000_trade_reminder_cron_jobs.sql).
//
// vite-plugin-pwa genera el service worker con la estrategia `generateSW`
// (workbox precachea el app shell — ver vite.config.ts), así que no hay un
// archivo fuente propio donde agregar listeners a mano. Este archivo se
// inyecta en el SW generado vía `workbox.importScripts` en vite.config.ts:
// es un script clásico (no un módulo), corre en el mismo scope que el SW
// generado y puede usar `self.addEventListener` directamente. Es la forma
// menos invasiva de agregar push sin migrar a la estrategia `injectManifest`
// (reescribir el SW entero) sobre una PWA que ya está en producción.
//
// Nota de cache: a diferencia de los assets con hash del build, esta URL es
// estática (/sw-push.js) — el navegador no la re-versiona automáticamente
// como al resto del precache. Si se edita este archivo, subir el query param
// ?v=N en vite.config.ts para forzar que los clientes lo vuelvan a pedir.
self.addEventListener('push', (event) => {
  let payload = { title: 'LineaTrade', body: '¿Ya registraste tu trade de hoy?', url: '/nuevo-trade' }
  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() }
    } catch {
      // Payload no-JSON (no debería pasar — send-trade-reminders siempre
      // manda JSON) — nos quedamos con el default en vez de romper el push.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/nuevo-trade'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => new URL(client.url).pathname === targetUrl)
      if (existing) return existing.focus()
      return self.clients.openWindow(targetUrl)
    }),
  )
})
