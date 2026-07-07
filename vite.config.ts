import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Solo cachea el app shell (JS/CSS/HTML/íconos). Las llamadas a Supabase
      // (auth, trades, storage) nunca deben servirse desde caché — son datos
      // financieros/de sesión que tienen que ser siempre en vivo.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
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
        start_url: '/',
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
