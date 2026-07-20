# LineaTrade — Sistema de Diseño e Identidad de Marca

**Estado:** vivo — primera versión formal, escrita a partir del sistema visual ya
existente en `src/index.css` (no un rediseño desde cero, ver §1). **Última actualización:**
2026-07-20. **Documentos relacionados:** `trade-journal-os-prd-v2.md` (principios de
producto), `CLAUDE.md` (estado real del código, sección "Design system — the important
part").

Este documento es la fuente de verdad para cualquier decisión visual en LineaTrade: color,
tipografía, espaciado, movimiento, iconografía y patrones de componente. Si vas a tocar UI,
leé esto antes — y si el código diverge de lo que dice este documento, el código gana y este
documento se corrige (mismo principio que `CLAUDE.md` aplica sobre sí mismo).

---

## 1. Alcance de esta ronda de trabajo

El código ya tenía una identidad deliberada — **dark editorial**, acento ámbar, tipografía
Space Grotesk/Inter/JetBrains Mono, profundidad vía sombras y grano sutil — descrita en
`CLAUDE.md` como intencional, no accidental. La decisión para esta ronda fue **formalizar y
elevar eso**, no reemplazarlo. Este documento:

1. Documenta el sistema tal como existe hoy (§3–§7).
2. Corrige una inconsistencia semántica real encontrada durante la auditoría — el color de
   ganancia/pérdida no seguía la convención universal de trading (§3.2).
3. Deja un backlog priorizado, pantalla por pantalla, para las próximas rondas (§9).

**Trabajo de esta ronda ya aplicado al código** (ver §3.2 y el changelog en §11):
tokens `--color-gain`/`--color-loss` nuevos en `src/index.css`, aplicados a badges
long/short, resultado de P&L, y botones Compra/Venta; ~25 usos de `text-red-400` hardcodeado
(mensajes de error) migrados al token semántico `text-loss`.

---

## 2. Principios de marca

La identidad visual sirve al mismo contrato que el producto: **"les ayudamos a cometer menos
errores"**, no "les ayudamos a ganar más". Eso se traduce en decisiones visuales concretas,
no solo en copy:

1. **Sobrio antes que emocionante.** Nada de gráficos que prometan rentabilidad, nada de
   verde-dinero-fácil. El acento de marca es ámbar (`--color-signal`) — cálido pero neutral,
   no eufórico. Comparar contra TradeZella (paleta brillante, "feels fun and upbeat") es
   deliberado: LineaTrade se posiciona más cerca de Edgewonk/Bloomberg Terminal en seriedad,
   pero sin caer en su densidad intimidante — ver §9 sobre por qué el Dashboard actual falla
   este balance.
2. **El dato manda, la decoración no.** Números en `font-mono` con `tabular-nums`, jerarquía
   por tamaño y contraste antes que por color. El grano y las auras (`hero-aura`,
   `grain-overlay`) son textura ambiental, nunca información.
3. **Un único acento de marca.** `--color-signal` (ámbar) es *la* firma de LineaTrade — CTAs,
   links, foco de teclado, "estás aquí". No se reutiliza para comunicar ganancia/pérdida
   (ver §3.2): mezclar "esto es LineaTrade" con "esto es una ganancia" diluye ambas señales.
4. **Trader-familiar donde el trader ya tiene un lenguaje.** El producto es editorial y propio
   en tipografía/layout/movimiento, pero en las convenciones que un trader ya trae de otras
   apps (verde/rojo para largo/corto y ganancia/pérdida) no inventamos un lenguaje nuevo —
   ver §3.2.

---

## 3. Color

### 3.1 Tokens base (ya existentes en `src/index.css`)

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#0A0D12` | Fondo de página |
| `--color-panel` | `#12161D` | Fondo de tarjeta/superficie |
| `--color-panel-2` | `#191E27` | Fondo de tarjeta elevada / gradientes |
| `--color-hairline` | `#232935` | Bordes, divisores |
| `--color-signal` | `#E3A94A` | **Acento de marca** — CTA, links, foco, "activo" |
| `--color-signal-dim` | `#B8863A` | Hover/estado presionado de `signal` |
| `--color-steel` | `#5B7A99` | Acento secundario neutral (p. ej. "short" antes de esta ronda, ahora libre para otros usos neutrales) |
| `--color-text-primary` | `#E7E9EC` | Texto principal |
| `--color-text-muted` | `#8A93A3` | Texto secundario |
| `--color-text-faint` | `#565D6B` | Texto terciario / metadata |

### 3.2 Par semántico de ganancia/pérdida (nuevo en esta ronda)

```css
--color-gain: #0ECB81;
--color-gain-dim: #0BA868;
--color-loss: #F6465D;
--color-loss-dim: #D8394E;
```

**Qué se rompía antes:** `lib/tradeDisplay.ts`'s `tradeResultColorClass` pintaba una
ganancia con `text-signal` (el ámbar de marca) y una pérdida con `text-red-400` (un rojo
genérico de Tailwind, sin token). Los badges "long"/"short" en `Dashboard`, `Historial` y
`TradeDetail` usaban `signal`/`steel` — ni siquiera intentaban comunicar
ganancia/pérdida. Resultado: la señal más universal del trading (verde=sube/gana,
rojo=baja/pierde) simplemente no existía en el producto, y el ámbar de marca hacía doble
trabajo como "esto es LineaTrade" y "esto ganó plata" — dos significados distintos peleando
por el mismo color.

**Por qué el fix es así, con fuentes:**

- La convención verde=ganancia/rojo=pérdida es prácticamente universal en plataformas de
  trading — "financial platforms universally use green to signal gain and red to signal
  loss, and deviating from this convention breaks user trust immediately" (Lollypop,
  [*Trading App Design: The Complete Guide*](https://lollypop.design/blog/2026/june/trading-app-design/),
  2026).
- El valor exacto (`#0ECB81` / `#F6465D`) replica la paleta de Binance — no TradingView ni
  un verde/rojo genérico de Tailwind — porque Binance es, con MetaTrader y TradingView, una
  de las apps de trading más usadas a nivel mobile globalmente; un trader que abre LineaTrade
  después de su bróker no debería tener que re-aprender qué color significa qué. Ambos
  valores pasan WCAG AA (>4.5:1 de contraste) contra `--color-ink`.
- Las guías de fintech modernas recomiendan tokenizar esto como un par semántico
  independiente del acento de marca, no reusarlo — "rather than hard-coding 'Green' for
  profit, teams use a token like Trend-Positive... instead of hard-coded hex values"
  (ColorArchive, [*Color in Financial UI*](https://colorarchive.org/guides/financial-ui-color-guide/)).
  De ahí `--color-gain`/`--color-loss` como tokens propios en `@theme`, nunca `green-500`
  ni `red-400` sueltos en un componente — ya lo exigía `CLAUDE.md` ("Do not hardcode hex
  colors... add or reuse a token"), esta ronda solo cierra el hueco que faltaba.
- Regla de accesibilidad aplicada de fábrica en este producto: el color nunca es el único
  canal. `formatTradeResult` ya antepone el signo (`+2.4R` / `-1.1R`) — eso importa porque
  ~8% de los hombres tienen alguna forma de daltonismo rojo-verde, y el signo mantiene la
  información legible sin depender del color (mismo principio que ColorArchive documenta:
  "profit/loss must always be encoded through a second channel... alongside color"). No
  hay que agregar nada nuevo acá, solo no romperlo al tocar estos componentes.

**Dónde se aplicó:** `lib/tradeDisplay.ts` (`tradeResultColorClass`), badge long/short en
`Dashboard.tsx`/`Historial.tsx`/`TradeDetail.tsx`, el monto de P&L inline en
`TradeDetail.tsx`, y los botones "Compra (long)"/"Venta (short)" de
`TechnicalEntryPanel.tsx` (incluye el ícono `BuyIcon`/`SellIcon`, que hereda color vía
`currentColor`).

**Regla a partir de ahora:** `--color-signal` es marca. `--color-gain`/`--color-loss` son
P&L y dirección (long/short, compra/venta). Nunca se cruzan. Si una futura pantalla necesita
comunicar "esto es bueno" fuera del contexto de P&L (p. ej. un objetivo cumplido en
`Sistema`), evaluar si es realmente "ganancia" (usar `gain`) o es "logro/marca" (usar
`signal`) — no asumir que son intercambiables.

### 3.3 Error / destructivo

`text-loss` / `border-loss` también cubren mensajes de error de formulario y estados
destructivos (antes `text-red-400` hardcodeado en ~25 archivos). Es una decisión deliberada
de simplicidad: un error de sistema y una pérdida de trading son, semánticamente, la misma
categoría ("algo negativo pasó") — no se justifica un tercer token solo para diferenciarlos
visualmente cuando nunca aparecen en el mismo contexto de lectura. Si en el futuro un flujo
necesita mostrar *ambos* a la vez (p. ej. un error de validación sobre un campo de P&L) y la
ambigüedad visual importa, ahí sí separar en `--color-danger`.

### 3.4 Profundidad

`--shadow-card` / `--shadow-elevated` / `--shadow-glow` ya existentes — reutilizar, no
inventar sombras nuevas por componente.

### 3.5 Puente de tokens shadcn/ui (nuevo — ver §10 "Fundación shadcn/ui")

`src/index.css`'s `@theme` block define los nombres semánticos estándar de shadcn
(`background`/`foreground`/`primary`/`card`/`muted`/`accent`/`destructive`/`border`/
`input`/`ring`, etc.), cada uno apuntando con `var()` a un token de marca que ya existía
(`background` → `ink`, `primary` → `signal`, `destructive` → `loss`, `border` → `hairline`,
...). **Son alias, no una paleta nueva** — no hay ningún hex nuevo en ese bloque. Esto
significa que un componente shadcn recién copiado (`npx shadcn add lo-que-sea`, o pegado a
mano) usa clases como `bg-primary`/`text-muted-foreground` y ya sale con los colores de
marca correctos, sin tocar una sola clase de color. **Regla:** si agregás un componente
shadcn nuevo, no le agregues colores de marca a mano (`bg-signal` en vez de `bg-primary`)
salvo que necesites algo que el puente no cubre (como los hover `-dim` de §3.2, que sí se
usan directo — ver `components/ui/button.tsx`). Y al revés: nunca agregues un nombre
semántico nuevo a este bloque apuntando a un hex crudo — siempre a un token de §3.1/§3.2
existente.

---

## 4. Tipografía

| Token | Familia | Uso |
|---|---|---|
| `--font-display` | Space Grotesk | Headings, cifras destacadas (`MetricCard` value) |
| `--font-body` | Inter | Texto de UI, párrafos, labels |
| `--font-mono` | JetBrains Mono | Números tabulares, metadata, badges, timestamps — **siempre** con `tabular-nums` cuando el valor puede cambiar de ancho (precios, P&L) |
| `--font-serif` | Merriweather | Reservada para Noticias (masthead editorial) — no usar fuera de ese contexto |

Tamaños via valores arbitrarios de Tailwind (`text-[44px]`, `text-[13px]`, etc.), no una
escala `text-sm/md/lg` genérica — es deliberado (ver `CLAUDE.md`), mantiene control fino
sobre cada contexto. No introducir una escala numérica nueva; si un tamaño se repite 3+
veces en el mismo tipo de componente, es candidato a documentarse acá como valor estándar,
no a convertirse en una utilidad Tailwind nueva.

---

## 5. Movimiento

- Solo propiedades compositor-friendly: `transform`, `opacity`. Nunca `width`/`height`/
  `top`/`left` en animación.
- `.reveal-up` (entrada, stagger vía `animationDelay` inline) y `reveal` (keyframe corto,
  paneles que aparecen) son los dos primitivos existentes — reusarlos antes de escribir un
  keyframe nuevo.
- Guard global de `prefers-reduced-motion` en `index.css` — cualquier animación nueva debe
  respetarlo (ya lo hace por herencia si usa las clases existentes).
- No hay ninguna librería de animación (`framer-motion`, `tailwindcss-animate`) — el patrón
  es keyframe en CSS + clase o `style` inline. No agregar una dependencia nueva para esto.

---

## 6. Iconografía

`components/icons/TradeIcons.tsx` (6 íconos recortados a mano de un pack de 50, ver
`CLAUDE.md`) y `components/icons/NavIcons.tsx`. Todos con `fill="currentColor"` — heredan
color de la clase de texto del contenedor, nunca un hex fijo dentro del SVG. Si un ícono
necesita reflejar estado (como `BuyIcon`/`SellIcon` ahora reflejan `gain`/`loss` cuando su
acción está activa, ver §3.2), aplicar la clase de color al ícono directamente o a un
`span` envolvente — no editar el SVG.

---

## 7. Patrones de componente

- **Card de superficie:** `border border-hairline rounded-sm bg-gradient-to-b from-panel-2
  to-panel shadow-card`, hover `hover:-translate-y-0.5 hover:border-signal/30
  hover:shadow-elevated`. Usado en `MetricCard`, filas de trade, CTAs de Landing.
- **Badge:** `font-mono text-[11px] px-2 py-0.5 rounded-sm border` + color semántico
  (`gain`/`loss` para dirección de trade, `signal` para estado neutral destacado).
- **Botón primario:** `bg-signal text-ink font-medium ... hover:bg-signal-dim
  hover:shadow-glow hover:-translate-y-0.5`. Reservado para la acción principal de la
  pantalla — no usar en botones secundarios.
- **Botón segmentado (`SegmentButton` en `TechnicalEntryPanel`):** ahora acepta un `tone`
  (`signal` por defecto, `gain`/`loss` para pares direccionales tipo compra/venta) — patrón
  a reusar si aparece otro selector de dos opciones con semántica direccional (p. ej. call/put
  podría evaluarse igual en una próxima ronda, ver §9).
- **Toast:** borde izquierdo de 2px por tipo (`success` → `signal`, `error` → `loss`, `info`
  → `steel`).
- **Fila de lista de trade (`components/trade/TradeListRow.tsx`):** compartida por
  Dashboard ("Últimos trades") e Historial (lista completa) — antes cada pantalla tenía su
  propia copia casi idéntica del markup. Tres elementos de jerarquía sobre la fila plana
  original: (1) un riel de 3px a la izquierda con el color `gain`/`loss` según `side` —
  reusa el mismo par semántico que ya pinta el badge y el resultado, no inventa un tercer
  significado; (2) el símbolo en `font-display` en vez de `font-mono`, para que destaque
  sobre los metadatos (badge, estado, fecha) que sí se quedan en mono; (3) entrada
  escalonada vía `.reveal-up` + `animationDelay` por índice, limitada a las primeras 12
  filas (`STAGGER_LIMIT`) — más allá de eso el delay es ruido, no pulido, en una lista sin
  límite como Historial. Al agregar una fila de lista nueva en cualquier pantalla futura,
  evaluar si encaja este mismo patrón antes de escribir un componente nuevo.

---

## 8. Fuentes de investigación consultadas en esta ronda

- Lollypop Design, [*Trading App Design: The Complete Guide to UI, UX & System
  Architecture (2026)*](https://lollypop.design/blog/2026/june/trading-app-design/) —
  convenciones de navegación mobile, jerarquía de datos en vivo, verde/rojo no-negociable.
- ColorArchive, [*Color in Financial UI: Trust, Data Visualization, and the Red/Green
  Convention*](https://colorarchive.org/guides/financial-ui-color-guide/) — tokenización
  semántica, accesibilidad daltonismo, contraste WCAG.
- Comparativa de journals de trading 2026 (TradeZella, Edgewonk, TraderSync) vía múltiples
  reseñas — usada para posicionar a LineaTrade deliberadamente *entre* "brillante y
  divertido" (TradeZella) y "denso y serio" (Edgewonk), no copiar ninguno de los dos.
- Paleta de color de Binance (verde `#0ECB81` / rojo `#F6465D`) como referencia directa de
  "la app de trading que más gente ya conoce a nivel mobile", por pedido explícito del
  dueño del producto.

---

## 9. Backlog priorizado para próximas rondas

Encontrado durante esta auditoría, no implementado aún — orden sugerido por impacto:

1. ~~**Dashboard no muestra ninguna métrica agregada.**~~ **Resuelto 2026-07-20** — ver
   §10. Sigue documentado acá por historia; los puntos 2+ quedan como siguiente prioridad.
2. ~~**Filas de trade son planas comparadas con Landing.**~~ **Resuelto 2026-07-20** — ver
   §7 (nuevo patrón "Fila de lista de trade") y §10.
3. **Long/short ahora tiene color semántico — extenderlo a Call/Put.** `TechnicalEntryPanel`
   ya tiene el patrón (`SegmentButton` con `tone`); evaluar si Call (alcista) / Put
   (bajista) merece el mismo tratamiento `gain`/`loss`, o si eso sobrecargaría el
   significado de esos tokens (un Put no es necesariamente una "pérdida"). Decisión de
   producto, no solo de UI — no se resolvió en esta ronda a propósito.
4. **Auditoría anti-template pantalla por pantalla.** `Sistema`, `ConfiguracionIA`,
   `AdminPanel`, `Perfil` no fueron revisadas en esta ronda. Pasarlas por el checklist de
   §7 y el principio de §2.2 (jerarquía por tamaño/contraste, no decoración).
5. **Logo/wordmark formal.** Hoy "lineatrade" aparece como texto `font-mono` plano en el
   footer del Landing y como wordmark en `AppHeader`. El ícono de marca real (el trazo
   ámbar, `src/assets/pwa-icon-source.svg`) no tiene una versión de wordmark+ícono combinada
   para usos fuera de la PWA (redes, press kit, etc.) — evaluar si hace falta.
6. **Migrar los botones existentes a `<Button>` (`components/ui/button.tsx`).** El
   componente ya existe (ver §10) pero ningún botón del código lo usa todavía — cada
   pantalla sigue con su propia clase inline (`bg-signal text-ink ... hover:bg-signal-dim
   hover:shadow-glow hover:-translate-y-0.5`, repetida en Landing, Dashboard, TradeDetail,
   etc.). Migrar es mecánico pero tocar ~15+ archivos merece su propia ronda con
   verificación, no colarse dentro de otro cambio.

---

## 10. Fundación shadcn/ui (decisión de arquitectura, 2026-07-20)

El dueño del producto confirmó explícitamente adoptar shadcn/ui como base para componentes
interactivos/compuestos nuevos (acordeones, diálogos, menús — lo que Radix cubre), en vez
de seguir escribiendo cada uno a mano. Esto es un cambio de arquitectura real, no un
componente suelto — documentado acá para que quede claro qué se decidió y qué no:

- **Qué se instaló:** `class-variance-authority`, `clsx`, `tailwind-merge`,
  `@radix-ui/react-accordion`, `@radix-ui/react-slot`, `lucide-react`. Alias de path `@/*`
  → `./src/*` en `tsconfig.json`/`tsconfig.app.json`/`vite.config.ts`. `src/lib/utils.ts`
  con el helper `cn()` estándar de shadcn (`clsx` + `tailwind-merge`).
- **Qué NO se instaló:** `next` ni nada de Next.js. La referencia que originó este trabajo
  venía de un proyecto Next.js (`next/link`, convención de shadcn CLI pensada para App
  Router) — LineaTrade es Vite + `react-router-dom` y sigue siéndolo. Los componentes
  copiados usan `Link` de `react-router-dom`, no `next/link`. Tampoco se instaló Magic UI
  ni `tw-animate-css` — no fueron confirmados explícitamente en esta ronda.
- **Cómo conviven los dos sistemas:** no conviven como dos sistemas — shadcn corre sobre
  los tokens de marca existentes vía el puente de §3.5. `components/ui/` son componentes
  "copiados y adaptados" (el espíritu real de shadcn: el código es tuyo, no un paquete de
  node_modules que consumís como caja negra), no una librería externa con su propia
  identidad visual. Dos ajustes deliberados sobre el shadcn "de fábrica": `rounded-sm` en
  vez de `rounded-md`/`rounded-lg` (match con el radio de 2px que usa todo el producto,
  ver §7), y sin `forwardRef` (React 19 acepta `ref` como prop plana — ver `CLAUDE.md` →
  Stack).
- **`components/ui/button.tsx` y `components/ui/accordion.tsx`** son los primeros dos.
  `Button` no reemplazó ningún botón existente en esta ronda — los ~15+ botones repartidos
  por el código siguen con su clase inline. Migrarlos a `<Button>` es trabajo aparte (ver
  backlog #6), no algo que deba pasar solo porque el componente ya existe.
- **Bug de plataforma encontrado:** en el navegador embebido usado para verificar este
  trabajo, la propiedad CSS moderna `rotate` (la que Tailwind v4 genera para utilidades
  `rotate-*`) no se aplicaba — `getComputedStyle().rotate` se quedaba en `0deg` incluso
  seteada a mano por `style.setProperty`. `transform: rotate(...)` sí funcionó. Por eso
  `AccordionTrigger`'s flecha usa `[&[data-state=open]>svg]:[transform:rotate(180deg)]`
  (sintaxis de propiedad arbitraria) en vez de `rotate-180` — más compatible, no solo un
  parche para esta herramienta puntual.

## 11. Changelog

**2026-07-20 (ronda 1)** — Primera versión de este documento. Agregados `--color-gain`/
`--color-gain-dim`/`--color-loss`/`--color-loss-dim` a `src/index.css`. Migrados a estos
tokens: `lib/tradeDisplay.ts`, badges long/short en `Dashboard.tsx`/`Historial.tsx`/
`TradeDetail.tsx`, P&L inline en `TradeDetail.tsx`, botones Compra/Venta en
`TechnicalEntryPanel.tsx` (+ íconos `BuyIcon`/`SellIcon`). Migrados ~25 usos de
`text-red-400` hardcodeado a `text-loss` en mensajes de error de formulario/sistema
(`AIAnalysisPanel`, `ConfiguracionIA`, `AdminPanel`, `ActualizarPassword`, `toast.tsx`,
`ObjectivesSection`, `StrategiesSection`, `RulesSection`, `NuevoTrade`, `Login`,
`TechnicalEntryPanel`, `IaTrader`, `Dashboard`, `Perfil`, `Onboarding`, `Recuperar`,
`Signup`, `Historial`, `Noticias`). Verificado: `npm run build` limpio, utilidades Tailwind
generadas correctamente, sin regresiones visuales en Landing, contraste confirmado
visualmente sobre `--color-ink`.

**2026-07-20 (ronda 2)** — Cerrado el backlog #1: `Dashboard.tsx` ahora consulta
`v_user_trade_stats` (mismo patrón que `Perfil.tsx`) y renderiza una fila de 4
`MetricCard` (win rate, profit factor, R promedio, trades) antes de la lista de últimos
trades, con el mismo aviso ("solo se calculan sobre trades cerrados") cuando corresponde.
`MetricCard` ganó un prop `tone` (`default`/`gain`/`loss`) — aplicado solo a R promedio
(`signedTone()`, nuevo en `lib/tradeDisplay.ts`), deliberadamente **no** aplicado a win
rate ni profit factor (ver el comentario en `signedTone` — colorear esas dos implicaría un
juicio de calidad que el producto no hace). `formatPercent`/`formatNumber`/`formatSigned`
se movieron de `Perfil.tsx` a `lib/tradeDisplay.ts` para evitar duplicación entre las dos
pantallas que ahora comparten el mismo panel de métricas. Corrección de ortografía real
encontrada en una pasada de proofreading: "autoreporte" → "autorreporte" en
`TradeDetail.tsx` (la `r` doble es obligatoria cuando el prefijo `auto-` precede a una
palabra que empieza con `r`, para preservar el sonido vibrante — mismo caso que
"contrarreloj"). Verificado end-to-end contra el stack local (no producción): usuario de
prueba creado vía Admin API, 3 trades sintéticos insertados (long ganador +0.96R, short
perdedor -0.64R, uno abierto), login real por UI, colores computados leídos directamente
del DOM (`getComputedStyle`) confirmando `rgb(14,203,129)` en long/ganancia,
`rgb(246,70,93)` en short/pérdida, y neutro en win rate/profit factor — coincide
exactamente con los tokens. Datos de prueba y usuario borrados después; `.env.local`
restaurado a su valor original (apuntaba a Supabase Cloud, se usó el modo local solo
temporalmente para esta verificación).

**2026-07-20 (ronda 3)** — Cerrado el backlog #2: nuevo componente compartido
`components/trade/TradeListRow.tsx` (ver §7) usado ahora por `Dashboard.tsx` e
`Historial.tsx`, que antes duplicaban casi el mismo markup de fila. Verificado contra el
stack local con 5 trades sintéticos (mezcla long/short, ganancia/pérdida): colores de riel
confirmados por `getComputedStyle` (verde/rojo alternando exactamente según `side`), delay
de animación incremental confirmado (`0s, 0.04s, 0.08s...`), tipografía del símbolo
confirmada en Space Grotesk (`font-display`). Sin errores de consola. Datos de prueba y
usuario borrados después; `.env.local` restaurado.

**2026-07-20 (ronda 4)** — Fundación shadcn/ui (ver §10 para el detalle completo de la
decisión): `components/ui/button.tsx` y `components/ui/accordion.tsx`, puente de tokens en
`src/index.css` (§3.5), alias `@/*`. Nueva sección de FAQ en `Landing.tsx` (5 preguntas en
español, contenido real de journal de trading — no el placeholder de e-commerce de la
referencia original), construida con el `Accordion` nuevo. Corregido también
`HistoryIcon` (`components/icons/NavIcons.tsx`) — sus 3 barras horizontales no eran del
mismo largo (`M6 6h12M6 12h12M6 18h8`, la tercera medía 8 en vez de 12); ahora las tres
miden 12. Verificado: `npm run build`/`lint` limpios; acordeón probado en el navegador —
abre/cierra correctamente (`data-state` confirmado), contenido visible, flecha rota 180°
(tras cambiar de la propiedad CSS `rotate` a `transform: rotate()` por el bug de
plataforma descrito en §10); path del `HistoryIcon` confirmado con las 3 barras iguales;
sin errores de consola.
