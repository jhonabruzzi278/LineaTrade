// FloatingNav (Aceternity UI / 21st.dev) portado a este stack: react-router
// (<Link to>) en vez de next/link y sin "use client" (Vite no tiene RSC).
// Adaptaciones deliberadas sobre el original, todas necesarias para usarlo
// como navegación primaria de una app autenticada y no como adorno de landing:
//   1. `visible` arranca en true y se mantiene visible cerca del tope — el
//      original arranca oculto y solo aparece al scrollear hacia arriba, lo que
//      dejaría páginas cortas (Perfil, Configuración) sin navegación alguna.
//   2. El botón de la derecha ("Login" hardcodeado en el original) se
//      parametriza vía props para poder usarlo como "Salir".
//   3. La visibilidad se calcula con un listener de `scroll` crudo sobre
//      `window.scrollY` (comparado contra su última lectura), no con el
//      `useScroll`/`scrollYProgress` de framer-motion del original —
//      `scrollYProgress` es `scrollY / (scrollHeight - clientHeight)`, y en
//      cualquier página sin overflow (Dashboard vacío, Perfil, Sistema) ese
//      denominador es 0 (`NaN`). Un solo layout shift transitorio durante la
//      carga bastaba para disparar un evento de "scroll hacia abajo" espurio
//      que ocultaba la píldora para siempre, porque sin overflow real no
//      vuelve a haber otro evento de scroll que la reviva.
//   4. La animación de entrada/salida se hace con clases CSS de Tailwind
//      (`transition-all` + `translate-y`/`opacity` condicionales), no con
//      `motion.div`/`AnimatePresence` de framer-motion como en el original.
//      Verificado en vivo (fiber de React + `getAnimations()`) que framer-motion
//      nunca corría la transición `initial → animate` en esta app — el prop
//      `animate` se actualizaba correctamente en cada render pero el DOM
//      quedaba congelado para siempre en su `initial` (`translateY(-100px)`,
//      la píldora entera renderizando fuera de pantalla), sin ninguna
//      animación activa (`getAnimations()` devolvía `[]`) y sin excepción
//      visible. framer-motion no se usa en ningún otro archivo del proyecto —
//      una transición CSS simple de dos estados no necesita esa dependencia,
//      y evita por completo esa clase de bug.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface FloatingNavItem {
  name: string
  link: string
  icon?: ReactNode
}

export const FloatingNav = ({
  navItems,
  className,
  buttonLabel = 'Login',
  onButtonClick,
}: {
  navItems: FloatingNavItem[]
  className?: string
  buttonLabel?: string
  onButtonClick?: () => void
}) => {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY
      // Cerca del tope siempre visible (arranque/páginas cortas); más abajo,
      // visible solo si el scroll fue hacia arriba respecto de la última lectura.
      setVisible(currentY < 60 || currentY < lastScrollY.current)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      className={cn(
        'flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4 transition-all duration-200 ease-out',
        visible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0 pointer-events-none',
        className,
      )}
    >
      {navItems.map((navItem, idx) => (
        <Link
          key={`link=${idx}`}
          to={navItem.link}
          aria-label={navItem.name}
          title={navItem.name}
          className={cn(
            'relative dark:text-neutral-50 items-center flex space-x-1 text-neutral-600 dark:hover:text-neutral-300 hover:text-neutral-500',
          )}
        >
          {/* Solo íconos en todas las pantallas — las palabras se retiraron
              a pedido; el nombre queda en aria-label/title para accesibilidad
              y tooltip nativo al hacer hover. */}
          <span className="block">{navItem.icon}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={onButtonClick}
        className="border text-sm font-medium relative border-neutral-200 dark:border-white/[0.2] text-black dark:text-white px-4 py-2 rounded-full"
      >
        <span>{buttonLabel}</span>
        <span className="absolute inset-x-0 w-1/2 mx-auto -bottom-px bg-gradient-to-r from-transparent via-blue-500 to-transparent h-px" />
      </button>
    </div>
  )
}
