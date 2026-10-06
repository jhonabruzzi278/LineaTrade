import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type Theme = 'dark' | 'light'

function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem('lineatrade:theme')
    if (stored === 'dark' || stored === 'light') return stored
  } catch { /* Theme remains usable when browser storage is unavailable. */ }
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('lineatrade:theme', theme) } catch { /* Session-only preference. */ }
  }, [theme])

  function toggleTheme() {
    const root = document.documentElement
    root.classList.add('theme-switching')
    const next = theme === 'dark' ? 'light' : 'dark'
    root.dataset.theme = next
    void document.body.offsetHeight
    setTheme(next)
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
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
