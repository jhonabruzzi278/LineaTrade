// Commit de prueba 2026-07-20: verifica si el auto-deploy de Vercel sigue disparando
// con pushes a main. Ver CLAUDE.md / historial de deploys si esto sigue sin desplegar.
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' en vez de 'autoUpdate': con datos financieros en pantalla no
      // queremos recargar la app sola de golpe. PwaUpdatePrompt avisa por toast
      // y el usuario decide cuándo recargar. injectRegister: false porque el
      // registro lo hace a mano el hook useRegisterSW (ver PwaUpdatePrompt.tsx).
      registerType: 'prompt',
      injectRegister: false,
      // Solo cachea el app shell (JS/CSS/HTML/íconos). Las llamadas a Supabase
      // (auth, trades, storage) nunca deben servirse desde caché — son datos
      // financieros/de sesión que tienen que ser siempre en vivo.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // Sin esto, el service worker intercepta la navegación a /downloads/lineatrade.apk
        // (no está en el precache a propósito, ver comentario de globPatterns arriba) y
        // sirve el fallback de SPA (index.html) en su lugar — el usuario "descarga" un
        // .apk que en realidad es HTML, y Android lo rechaza como paquete inválido.
        navigateFallbackDenylist: [/^\/downloads\//],
      },
      manifest: {
        id: '/',
        lang: 'es',
        name: 'LineaTrade',
        short_name: 'LineaTrade',
        description:
          'LineaTrade convierte tu disciplina de trading en evidencia. Registra tus operaciones y descubre patrones objetivos en tu comportamiento.',
        theme_color: '#0A0D12',
        background_color: '#0A0D12',
        display: 'standalone',
        orientation: 'portrait',
        // La landing ("/") es para visitas de navegador / marketing. La app
        // instalada (PWA / TWA de Play Store) arranca directo en el producto —
        // ProtectedRoute manda a /login si no hay sesión, que a su vez linkea
        // a /registro para altas nuevas.
        start_url: '/dashboard',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5180,
  },
})
