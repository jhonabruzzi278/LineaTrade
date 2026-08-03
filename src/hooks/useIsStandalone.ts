import { useEffect, useState } from 'react'
import { isStandaloneDisplay } from '../lib/standalone'

// Versión reactiva de isStandaloneDisplay() (lib/standalone.ts): esa función es una
// lectura síncrona de una sola vez, útil para una decisión de routing puntual
// (Landing.tsx), pero cualquier UI que deba reaccionar si el modo cambia en caliente
// (raro, pero posible si el usuario instala la PWA sin recargar) necesita suscribirse
// al media query en vez de leerlo una sola vez en el render inicial.
export function useIsStandalone(): boolean {
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay)

  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)')
    const handleChange = () => setIsStandalone(isStandaloneDisplay())
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isStandalone
}
