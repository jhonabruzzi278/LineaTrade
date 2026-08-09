import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'lt_sidebar_expanded'

interface SidebarContextValue {
  expanded: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined)

// Preferencia de UI pura (ancho del sidebar de escritorio) — a diferencia del caché de
// lib/news.ts, esto no es dato financiero/de sesión, así que localStorage es el lugar
// correcto (nada que ver con la regla "nunca localStorage" que rige ahí).
function readInitialExpanded(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(STORAGE_KEY) === 'true'
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(readInitialExpanded)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(expanded))
  }, [expanded])

  function toggle() {
    setExpanded((prev) => !prev)
  }

  return <SidebarContext.Provider value={{ expanded, toggle }}>{children}</SidebarContext.Provider>
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar debe usarse dentro de <SidebarProvider>')
  }
  return context
}
