# Rediseño "Fusión": guía de implementación

Fuente de verdad visual: el lienzo de diseño (archivos `.dc.html`, un archivo por pantalla,
escritorio y móvil). En esta máquina viven en:

`C:\Users\jonat\AppData\Local\Temp\claude\C--Trabajos-lineatrader\5886fd85-6fae-48ba-8954-57e666703050\scratchpad\design\project\`

Cada archivo es HTML con estilos en línea: léelo para ver estructura, textos, tamaños y colores.
No es código para copiar; hay que traducirlo a React + Tailwind usando los tokens y primitivas
de abajo. Textos de ejemplo (nombres, cifras) son ilustrativos: en código van los datos reales.

Prefijos: `Home-` Inicio · `Hist-`/`Det-`/`NT-` Journal · `Chk-` Checklist · `Rep-`/`Ins-`/`Coach-`/
`Iat-`/`Sim-`/`Eco-` Análisis · `Not-`/`NotDet-` Noticias · `Aca-`/`Lec*-`/`Gloss-` Academia ·
`Cta-`/`Pln-`/`Adm-` Cuenta · `Landing-`/`Auth-`/`Onb-` público · `Eco-` ecosistema de IA.

## Reglas del sistema

- **Colores**: solo tokens de `src/styles/tokens.css` (`bg-ink`, `bg-panel`, `bg-panel-2`,
  `border-hairline`, `text-text-primary|muted|faint`, `bg-signal`/`text-steel` para marca,
  `text-spark`/`bg-spark` para el acento amarillo, `text-gain`/`text-loss`). Nunca un hex.
- **Verde/rojo solo para ganancia/pérdida y dirección del trade (long/short).** Nunca para
  categorías, estados "ok/error" decorativos ni gráficos que no sean P&L. Los gráficos no
  P&L distinguen por forma/trazo (rayado, punteado) y rótulo, no solo por color.
- **Tipografía**: títulos `font-display` (Archivo expandido, ya con peso 800 global);
  texto `font-body` (Figtree); etiquetas y cifras `font-mono`. Clases utilitarias:
  `label-mono` (etiqueta en mayúsculas), `num` (cifras tabulares).
- **Botón principal**: clase `cta` (azul, borde de tinta, sombra dura amarilla). Máximo uno
  por pantalla. Secundarios: `Button variant="outline"`; destructivo: `variant="danger"`.
- **Radios**: botones/campos 10px, tarjetas 12px (`rounded-xl`), chips `rounded-full`.
  `rounded-sm` ya vale 10px.
- **Accesibilidad**: objetivos táctiles de 44px, `aria-*` en pestañas/segmentados/switches,
  no depender solo del color, `prefers-reduced-motion` ya está respetado globalmente.
- **Móvil primero**: 390px de ancho de referencia; el contenido deja `pb-28` para la barra
  inferior. Escritorio desde `lg:` (1024px).
- **Copy en español neutro LatAm**, sobrio, basado en evidencia. Nada de señales, promesas ni
  consejo financiero. Mostrar `n` y periodo cuando se citen estadísticas; con pocos datos,
  lenguaje de incertidumbre.

## Primitivas compartidas (no reinventar)

`src/components/ui/`: `card.tsx` (Card: default | brand | spark | dashed), `page-header.tsx`,
`tag.tsx`, `tabs.tsx`, `segmented.tsx`, `field.tsx` (Field + FIELD_CLASS), `callout.tsx`,
`progress-bar.tsx`, `button.tsx`. Además `src/components/MetricCard.tsx`, `Switch.tsx`,
`shell/BrandMark.tsx`. Si falta una primitiva genérica, créala como archivo NUEVO en
`src/components/ui/` con un nombre específico; no cambies la API de las existentes.

## Marco de la app (ya hecho)

`components/shell/` (`AppLayout`, `Sidebar`, `TabBar`, `AreaTabs`, `navConfig.ts`) dibuja la
navegación y reserva el espacio lateral. **Las pantallas no dibujan navegación, no llevan
padding lateral por la barra y no importan `AppHeader`/`AppFloatingNav` (ya no existen).**
Una pantalla renderiza solo su `<main>` con `mx-auto max-w-6xl px-5 pt-6 pb-28 lg:pb-12`.
Rutas en `src/App.tsx`; ítems de menú en `navConfig.ts` (`soon: true` oculta lo no construido).

## Revisión visual sin backend

`npm run dev` (puerto 5180) y abrir `/dashboard?mock` activa datos de ejemplo
(`src/dev/mockApi.ts`: sesión falsa + respuestas REST). Cubre perfil, trades, estadísticas y
entitlements; el resto responde vacío. Si una pantalla necesita más datos de ejemplo,
amplía `mockApi.ts` (solo desarrollo). Esperar ~10 s si el backend local no existe: los
reintentos de red retrasan el primer render.

## Verificación obligatoria antes de dar algo por terminado

`npm run build` (tsc + vite), `npm run lint` (sin errores nuevos), `npm test`. No uses `any`,
no dejes `console.log`, no hardcodees colores. Commits convencionales en español.
