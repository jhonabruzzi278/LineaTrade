import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '../lib/toast'

// No renderiza nada visible — solo escucha al service worker y avisa por
// toast cuando hay una versión nueva instalada y esperando (registerType:
// 'prompt' en vite.config.ts, así la recarga la decide el usuario y no la app).
export function PwaUpdatePrompt() {
  const { showToast } = useToast()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!needRefresh) return
    showToast('Hay una versión nueva de LineaTrade disponible.', 'info', {
      persistent: true,
      action: { label: 'Recargar', onClick: () => void updateServiceWorker(true) },
    })
  }, [needRefresh, showToast, updateServiceWorker])

  return null
}
