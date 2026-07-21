// FloatingNav (Aceternity UI / 21st.dev) portado a este stack: react-router
// (<Link to>) en vez de next/link y sin "use client" (Vite no tiene RSC).
// Adaptaciones deliberadas sobre el original, todas necesarias para usarlo
// como navegación primaria de una app autenticada y no como adorno de landing:
//   1. `visible` arranca en true y se mantiene visible cerca del extremo — el
//      original arranca oculto y solo aparece al scrollear hacia arriba, lo que
//      dejaría páginas cortas (Perfil, Configuración) sin navegación alguna.
//   2. El botón de la derecha ("Login" hardcodeado en el original) se eliminó
//      del todo — "Salir" ahora vive como acción explícita dentro de Perfil
//      (ver Perfil.tsx), no en la barra de navegación global. Menos un ícono
//      compitiendo por espacio, y una acción destructiva (cerrar sesión) deja
//      de estar a un toque accidental de distancia en la navegación principal.
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
//      quedaba congelado para siempre en su `initial`, sin ninguna animación
//      activa y sin excepción visible. framer-motion no se usa en ningún otro
//      archivo del proyecto — una transición CSS simple no necesita esa
//      dependencia, y evita por completo esa clase de bug.
//   5. Paleta y tipografía: reemplazadas las clases genéricas del template
//      (`bg-white`/`dark:bg-black`, texto `neutral-*`, acento azul) por los
//      tokens de marca de este proyecto (`panel-2`/`hairline`/`signal`/
//      `text-*`, ver `docs/lineatrade-design-system.md` §3). El template
//      original usaba el variant `dark:` de Tailwind (activo solo si el SO
//      del visitante está en modo oscuro); esta app es siempre oscura, sin
//      ningún toggle `dark` en el árbol, así que esas clases dejaban la
//      píldora renderizando **blanca** para cualquier usuario con el SO en
//      modo claro — un bloque genérico flotando sobre el fondo `ink` de la
//      app, nada que ver con su identidad visual.
//   6. Posición: `bottom` en vez de `top` — barra de navegación inferior
//      estilo app móvil (Instagram/apps de trading), no una píldora flotante
//      de landing. Desliza hacia ABAJO al ocultarse (coherente con estar
//      anclada abajo), y respeta `env(safe-area-inset-bottom)` para no quedar
//      debajo de la barra de gestos del sistema en la PWA instalada
//      (ver "PWA-to-APK" en CLAUDE.md).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface FloatingNavItem {
  name: string
  link: string
  icon?: ReactNode
  emphasized?: boolean
  // Para el ícono de Perfil (foto de avatar): un <img>/círculo no responde a
  // `text-signal` como un ícono SVG con `currentColor`, así que la ruta
  // activa se marca con un anillo en vez de un cambio de color.
  isAvatar?: boolean
}

export const FloatingNav = ({
  navItems,
  className,
}: {
  navItems: FloatingNavItem[]
  className?: string
}) => {
  const [visible, setVisible] = useState(true)
  const lastScrollY = useRef(0)

  useEffect(() => {
    function handleScroll() {
      const currentY = window.scrollY
      // Cerca del extremo siempre visible (arranque/páginas cortas); más
      // lejos, visible solo si el scroll fue hacia arriba respecto de la
      // última lectura.
      setVisible(currentY < 60 || currentY < lastScrollY.current)
      lastScrollY.current = currentY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      style={{ bottom: 'max(1rem, calc(0.5rem + env(safe-area-inset-bottom)))' }}
      className={cn(
        'flex max-w-fit fixed inset-x-0 mx-auto items-center gap-1 rounded-full border border-hairline bg-panel-2/95 backdrop-blur-md shadow-card z-[5000] px-2 py-2 transition-all duration-200 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none',
        className,
      )}
    >
      {navItems.map((navItem, idx) => (
        <NavLink
          key={`link=${idx}`}
          to={navItem.link}
          aria-label={navItem.name}
          title={navItem.name}
          className={({ isActive }) =>
            cn(
              'relative flex items-center justify-center w-11 h-11 rounded-full transition-colors duration-200',
              navItem.emphasized
                ? 'bg-signal text-ink hover:bg-signal-dim'
                : isActive
                  ? 'text-signal bg-signal/10'
                  : 'text-text-faint hover:text-text-primary hover:bg-panel/70',
            )
          }
        >
          {/* Solo íconos en todas las pantallas — las palabras se retiraron
              a pedido; el nombre queda en aria-label/title para accesibilidad
              y tooltip nativo al hacer hover. */}
          {({ isActive }) =>
            navItem.isAvatar ? (
              <span
                className={cn(
                  'rounded-full transition-shadow duration-200',
                  isActive && 'ring-2 ring-signal ring-offset-1 ring-offset-panel-2',
                )}
              >
                {navItem.icon}
              </span>
            ) : (
              navItem.icon
            )
          }
        </NavLink>
      ))}
    </div>
  )
}
