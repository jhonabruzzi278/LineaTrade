# Lineatrader

> **No ayudamos a los traders a ganar más dinero. Les ayudamos a cometer menos errores.**

Bitácora de trading **mobile-first** donde el trader registra sus operaciones (técnica,
contexto y psicología) y recibe interpretación **basada en evidencia** — nunca señales,
nunca predicciones, nunca asesoría financiera. El principio que sostiene toda la
arquitectura: **el backend calcula los hechos (SQL, determinístico) y la IA solo los
interpreta; jamás calcula ni inventa.**

**Estado:** 🚧 En desarrollo — proyecto colaborativo. **Fases 0, 1 y 2 completas**: todas
las pantallas planeadas (onboarding, auth, Nuevo Trade, Dashboard, Historial, Detalle de
Trade) existen y hablan con Supabase de verdad (local, vía Docker), incluyendo cierre de
trade con cálculo de PnL/R y subida de imágenes a Storage — verificado de punta a punta,
no solo compilado. Ver [roadmap](#roadmap-por-fases).

---

## Principios no negociables

1. **La IA nunca inventa.** Toda cifra que menciona existe literalmente en el contexto
   estructurado que recibe. La suficiencia de datos es una regla de código verificable,
   no criterio del modelo.
2. **El backend calcula, la IA interpreta.** Ninguna estadística sale del LLM; todas de
   vistas SQL.
3. **El usuario controla sus datos.** Sin redes sociales, sin rankings, sin compartir
   entre usuarios. El acceso de soporte queda siempre auditado.
4. **El journal es la única fuente de verdad** de cualquier análisis.

Detalle completo en [`docs/trade-journal-os-prd-v2.md`](docs/trade-journal-os-prd-v2.md).

---

## Stack

**Actual:** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · react-router-dom v7 · oxlint
· Supabase (Postgres 17, Auth, Storage, RLS) corriendo localmente vía Docker.

**Previsto (según PRD):** TanStack Query · TanStack Router · React Hook Form · Zod ·
Shadcn UI · Recharts · Framer Motion · adaptador propio multi-proveedor de IA
(Groq/GPT OSS 20B por defecto).

---

## Puesta en marcha

Requisitos: **Node 20+**, npm, y **Docker Desktop** (para el backend local de Supabase).

```bash
npm install       # instala dependencias
npm run db:start  # levanta Supabase local (Postgres + Auth + Storage + Studio)
cp .env.example .env.local   # y completa VITE_SUPABASE_ANON_KEY con `npm run db:status`
npm run dev       # servidor de desarrollo → http://localhost:5180
```

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR (puerto **5180**) |
| `npm run build` | Typecheck (`tsc -b`) + build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Linter (oxlint) |
| `npm run db:start` | Levanta el stack local de Supabase (Docker) — aplica migraciones + seed |
| `npm run db:stop` | Detiene el stack local |
| `npm run db:reset` | Recrea la base desde cero (todas las migraciones + seed) |
| `npm run db:status` | Imprime URLs y claves locales |
| `npm run db:types` | Regenera `src/types/database.ts` desde el schema local |

> No hay tests todavía. `npm run build` es la verificación efectiva: tipa todo el
> proyecto antes de empaquetar. **Debe pasar en verde antes de cualquier PR.**

> **Nota Windows:** los puertos locales de Supabase se movieron de 5432x a **5532x**
> (`supabase/config.toml`) porque Windows/Hyper-V puede reservar dinámicamente el rango
> por defecto y Docker no logra bindear ahí. Si `db:start` falla con un error de bind de
> socket, revisa `netsh interface ipv4 show excludedportrange protocol=tcp` antes de nada.

---

## Estructura del proyecto

```
src/
├── App.tsx              # Rutas (react-router-dom)
├── main.tsx             # Punto de entrada, envuelve <App/> en <AuthProvider/>
├── index.css            # Sistema de diseño: tokens de color/tipografía (@theme de Tailwind v4)
├── lib/                 # supabase.ts (cliente), auth.tsx (AuthProvider/useAuth),
│                         # errors.ts (getErrorMessage), instruments.ts (resolveInstrumentId)
├── types/database.ts    # Tipos generados desde el schema local — nunca editar a mano
├── data/                # Contenido estático (opciones de onboarding, lista de brokers)
├── components/          # Compartidos: Nav (público), AppHeader (autenticado), TraceLine,
│                         # WizardLayout, ProtectedRoute + trade/ (BrokerPicker,
│                         # TechnicalEntryPanel, PsychologySection)
└── pages/                Landing, Signup, Login, Recuperar, ActualizarPassword,
                          Onboarding, NuevoTrade, Dashboard, Historial, TradeDetail
supabase/
├── config.toml           # Puertos locales, config de Auth/Storage/Studio
├── migrations/           # Una migración por sección del schema (ver docs/trade-journal-os-schema.md)
└── seed.sql              # Catálogo inicial de instruments
docs/                    # Fuente de verdad del producto (PRD, schema, motor de IA, plan)
CLAUDE.md                # Guía de arquitectura para asistentes de IA
CONTRIBUTING.md          # Cómo colaborar
```

**Rutas actuales:** `/` (Landing) · `/registro` · `/login` · `/recuperar` ·
`/actualizar-password` · `/onboarding` 🔒 · `/nuevo-trade` 🔒 · `/dashboard` 🔒 ·
`/historial` 🔒 · `/trades/:id` 🔒 (🔒 = requiere sesión, vía `ProtectedRoute`)

### Sistema de diseño

Todos los colores y tipografías viven como CSS custom properties en
[`src/index.css`](src/index.css) (bloque `@theme` de Tailwind v4) y se consumen como
clases utilitarias (`bg-signal`, `text-text-muted`, `font-display`…). **No hardcodees
hex ni fuentes en componentes** — reutiliza o agrega un token.

---

## Roadmap por fases

| Fase | Alcance | Estado |
|---|---|---|
| **0** | Onboarding visual (Landing, Registro, Login, Recuperar) | ✅ Completa |
| **1** | Pantallas privadas: Onboarding, Nuevo Trade, Dashboard, Detalle, Historial | ✅ Completa |
| **2** | Backend real: schema, tipos generados, Auth, CRUD, Storage | ✅ Completa — schema, RLS, grants, Auth, CRUD, cierre de trade (PnL/R en un trigger) y subida de imágenes a `trade-images` (URLs firmadas, bucket privado), todo conectado y verificado local |
| **3** | Motor de IA: Edge Function de contexto, proveedores, rate limiting, BYOK | ⬜ |
| **4** | Panel SuperAdmin + observabilidad (Sentry, PostHog, audit_log) | ⬜ |

Plan detallado y desglose de tareas: [`docs/lineatrader-plan-implementacion.md`](docs/lineatrader-plan-implementacion.md)
y [CONTRIBUTING.md](CONTRIBUTING.md#desarrollo-por-partes).

---

## Documentación

La carpeta [`docs/`](docs/) es la **fuente de verdad** del producto — léela antes de
construir features. Ver el [índice de docs](docs/README.md).

## Colaborar

Este es un proyecto colaborativo en desarrollo. Antes de tu primer PR, lee
[CONTRIBUTING.md](CONTRIBUTING.md).
