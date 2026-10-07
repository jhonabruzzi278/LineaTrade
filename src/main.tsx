import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './lib/auth'
import { ToastProvider } from './lib/toast'

// Solo en desarrollo: `?mock` activa datos de ejemplo para revisar pantallas
// autenticadas sin backend (ver src/dev/mockApi.ts). Vite elimina este bloque
// del bundle de producción porque import.meta.env.DEV es falso.
if (import.meta.env.DEV) {
  if (new URLSearchParams(window.location.search).has('mock')) sessionStorage.setItem('lt_mock', '1')
  if (sessionStorage.getItem('lt_mock') === '1') {
    const { enableMockApi } = await import('./dev/mockApi')
    enableMockApi()
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
)
