// FloatingNav (Aceternity UI / 21st.dev) portado a este stack: react-router
// (<Link to>) en vez de next/link y sin "use client" (Vite no tiene RSC).
// Dos adaptaciones deliberadas sobre el original, ambas necesarias para usarlo
// como navegación primaria de una app autenticada y no como adorno de landing:
//   1. `visible` arranca en true y se mantiene visible cerca del tope — el
//      original arranca oculto y solo aparece al scrollear hacia arriba, lo que
//      dejaría páginas cortas (Perfil, Configuración) sin navegación alguna.
//   2. El botón de la derecha ("Login" hardcodeado en el original) se
//      parametriza vía props para poder usarlo como "Salir".
import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion'
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
  const { scrollYProgress } = useScroll()

  const [visible, setVisible] = useState(true)

  useMotionValueEvent(scrollYProgress, 'change', (current) => {
    // Check if current is not undefined and is a number
    if (typeof current === 'number') {
      // En páginas sin área scrolleable, framer emite scrollYProgress = 1 (la
      // util `progress()` devuelve 1 cuando el rango es 0) — sin este guard,
      // esa primera medición cuenta como "scroll hacia abajo" y la píldora se
      // ocultaría para siempre en páginas cortas (sin scroll no hay evento que
      // la traiga de vuelta).
      const root = document.documentElement
      if (root.scrollHeight <= root.clientHeight) {
        setVisible(true)
        return
      }

      const direction = current - (scrollYProgress.getPrevious() ?? 0)

      if (scrollYProgress.get() < 0.05) {
        setVisible(true)
      } else {
        if (direction < 0) {
          setVisible(true)
        } else {
          setVisible(false)
        }
      }
    }
  })

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{
          opacity: 1,
          y: -100,
        }}
        animate={{
          y: visible ? 0 : -100,
          opacity: visible ? 1 : 0,
        }}
        transition={{
          duration: 0.2,
        }}
        className={cn(
          'flex max-w-fit fixed top-10 inset-x-0 mx-auto border border-transparent dark:border-white/[0.2] rounded-full dark:bg-black bg-white shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] pr-2 pl-8 py-2 items-center justify-center space-x-4',
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
      </motion.div>
    </AnimatePresence>
  )
}
