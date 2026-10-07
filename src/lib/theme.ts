import { useCallback, useEffect, useState } from 'react'

// Preferencia de tema. «system» = sin preferencia guardada: se sigue el esquema
// del sistema operativo (misma regla que el script de arranque de index.html,
// que lee la misma clave antes de que React monte).
export type ThemePreference = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'lineatrade:theme'
const LIGHT_QUERY = '(prefers-color-scheme: light)'

/** Interpreta el valor guardado; cualquier otra cosa equivale a «system». */
export function parseThemePreference(stored: string | null): ThemePreference {
  return stored === 'dark' || stored === 'light' ? stored : 'system'
}

export function resolveTheme(preference: ThemePreference, systemPrefersLight: boolean): ResolvedTheme {
  if (preference === 'system') return systemPrefersLight ? 'light' : 'dark'
  return preference
}

function systemPrefersLight(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(LIGHT_QUERY).matches
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    // El tema sigue funcionando aunque el almacenamiento del navegador no esté disponible.
    return 'system'
  }
}

function persistPreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
    else localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Preferencia solo de esta sesión.
  }
}

function paintTheme(theme: ResolvedTheme, animate: boolean): void {
  const root = document.documentElement
  if (animate) root.classList.add('theme-switching')
  root.dataset.theme = theme
  if (animate) {
    void document.body.offsetHeight
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
  }
}

/** Guarda la preferencia (o la borra si es «system») y pinta el tema resultante. */
export function applyThemePreference(preference: ThemePreference): ResolvedTheme {
  persistPreference(preference)
  const resolved = resolveTheme(preference, systemPrefersLight())
  paintTheme(resolved, true)
  return resolved
}

export function currentResolvedTheme(): ResolvedTheme {
  return resolveTheme(readThemePreference(), systemPrefersLight())
}

// Hook para la pantalla de preferencias. Con «system» escucha los cambios del
// sistema operativo para que la app los siga en vivo.
export function useThemePreference(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(readThemePreference)

  useEffect(() => {
    if (preference !== 'system') return
    const query = window.matchMedia(LIGHT_QUERY)
    const onChange = () => paintTheme(resolveTheme('system', query.matches), false)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [preference])

  const update = useCallback((next: ThemePreference) => {
    applyThemePreference(next)
    setPreference(next)
  }, [])

  return [preference, update]
}
