import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { applyThemePreference, currentResolvedTheme, type ResolvedTheme } from '../lib/theme'

export function ThemeToggle() {
  const [theme, setTheme] = useState<ResolvedTheme>(currentResolvedTheme)

  // Solo se guarda una preferencia explícita al hacer clic: al montar no se
  // escribe nada, así «Sistema» (sin preferencia guardada) sigue siéndolo.
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    applyThemePreference(next)
    setTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-hairline bg-panel px-3 text-sm font-medium text-text-muted transition-[background-color,color,transform] duration-150 hover:bg-panel-2 hover:text-text-primary active:scale-[0.96]"
      aria-label={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
      <span className="hidden sm:inline">{theme === 'dark' ? 'Claro' : 'Oscuro'}</span>
    </button>
  )
}
