// Fondo animado reusable — misma pareja ambar/acero (hero-aura/steel-aura,
// index.css) que ya usaba Landing.tsx solo en su hero, ahora extraída para
// cubrir la pantalla completa de cualquier página que la monte. `fixed
// inset-0` + `z-[-1]` la deja detrás de todo el contenido normal (sin
// position) de la página — para que efectivamente se vea, la página que la
// use no debe pintar su propio `bg-ink` opaco de pantalla completa (el
// `background-color: var(--color-ink)` de <body> en index.css ya cubre ese
// fallback, así que quitarlo es seguro: si esta animación fallara por
// cualquier motivo, la página se ve idéntica a antes, no en blanco).
// pointer-events-none en el contenedor entero: nunca debe interceptar clics.
export function AuraBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="hero-aura aura-animated -top-32 -left-24 w-[640px] h-[640px]" />
      <div className="steel-aura aura-animated aura-animated-delay top-1/3 -right-32 w-[560px] h-[560px]" />
      <div className="hero-aura aura-animated -bottom-40 left-1/4 w-[500px] h-[500px]" />
    </div>
  )
}
