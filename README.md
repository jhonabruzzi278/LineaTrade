# Lineatrader

> **No ayudamos a los traders a ganar más dinero. Les ayudamos a cometer menos errores.**

Bitácora de trading **mobile-first** donde el trader registra sus operaciones (técnica,
contexto y psicología) y recibe interpretación **basada en evidencia** — nunca señales,
nunca predicciones, nunca asesoría financiera. El principio que sostiene toda la
arquitectura: **el backend calcula los hechos (SQL, determinístico) y la IA solo los
interpreta; jamás calcula ni inventa.**

**Estado:** 🚧 En desarrollo — proyecto colaborativo. **Fase 0 (onboarding) completa**;
backend aún no conectado. Ver [roadmap](#roadmap-por-fases).

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

**Actual (Fase 0):** React 19 · TypeScript · Vite 8 · Tailwind CSS v4 · react-router-dom v7 · oxlint

**Previsto (según PRD):** Supabase (Postgres, Auth, Storage, Edge Functions, RLS) ·
TanStack Query · TanStack Router · React Hook Form · Zod · Shadcn UI · Recharts ·
Framer Motion · adaptador propio multi-proveedor de IA (Groq/GPT OSS 20B por defecto).

---

## Puesta en marcha

Requisitos: **Node 20+** y npm.

```bash
npm install      # instala dependencias
npm run dev      # servidor de desarrollo → http://localhost:5180
```

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR (puerto **5180**) |
| `npm run build` | Typecheck (`tsc -b`) + build de producción a `dist/` |
| `npm run preview` | Sirve el build de producción localmente |
| `npm run lint` | Linter (oxlint) |

> No hay tests todavía. `npm run build` es la verificación efectiva: tipa todo el
> proyecto antes de empaquetar. **Debe pasar en verde antes de cualquier PR.**

---

## Estructura del proyecto

```
src/
├── App.tsx              # Rutas (react-router-dom)
├── main.tsx             # Punto de entrada
├── index.css            # Sistema de diseño: tokens de color/tipografía (@theme de Tailwind v4)
├── components/          # Componentes compartidos (Nav, TraceLine)
└── pages/               # Pantallas por ruta (Landing, Signup, Login, Recuperar)
docs/                    # Fuente de verdad del producto (PRD, schema, motor de IA, plan)
CLAUDE.md                # Guía de arquitectura para asistentes de IA
CONTRIBUTING.md          # Cómo colaborar
```

**Rutas actuales:** `/` (Landing) · `/registro` (Signup) · `/login` · `/recuperar`

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
| **1** | Pantallas privadas con datos mock: Dashboard, Nuevo Trade, Detalle, Historial | ⬜ Siguiente |
| **2** | Backend real: proyecto Supabase, schema, tipos generados, Auth, CRUD, Storage | ⬜ |
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
