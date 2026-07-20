# Logical Design

## Patrones detectados en el código

| Patrón | Dónde | Evidencia |
|---|---|---|
| Backend calcula, cliente nunca | `trades`, `v_user_trade_stats` | Trigger SQL para PnL/R; vistas SQL para stats — nunca `Array.reduce` en el cliente para métricas de negocio |
| Provider/Context para auth | `lib/auth.tsx` | `AuthProvider`/`useAuth()`, consumido por `ProtectedRoute`/`SuperAdminRoute` |
| Route guard por composición | `App.tsx` | `<ProtectedRoute><SuperAdminRoute><AdminPanel/></SuperAdminRoute></ProtectedRoute>` — guards anidados, no un único HOC monolítico |
| Wizard / multi-step form | `Onboarding.tsx`, `NuevoTrade.tsx` | `useWizard.ts` hook compartido + `WizardLayout.tsx` (progreso + Atrás/Continuar) |
| Security-definer function para romper recursión RLS | `is_superadmin()` | Documentado como fix real de un bug de producción (recursión infinita en policy) |
| security_invoker en vistas | Las 4 vistas (`v_user_trade_stats`, etc.) | Sin esto, cualquier vista sobre tabla RLS filtra con los privilegios del creador, no del caller — bug real encontrado y corregido |
| Edge Function con `service_role` para acceso auditado | Acceso de soporte a datos de otro usuario | Nunca una policy RLS que permita esto silenciosamente |
| BYOK vía Vault | `ai_provider_config`, `user_ai_settings` | Clave nunca vuelve en texto plano al cliente — se lee server-side vía `read_vault_secret` |
| Rate limiting atómico sin Redis | `ai_usage_daily` + `check_and_increment_ai_usage` | Una tabla + una función SQL en vez de infraestructura extra |
| Repository pattern | — | **No usado** — acceso directo vía cliente Supabase tipado desde componentes/páginas |
| CQRS | — | **No usado** explícitamente, aunque el principio "backend calcula (vistas) / frontend solo lee" es un CQRS informal de facto |

## Stack tecnológico (detectado, versiones reales de `package.json`)

| Componente | Tecnología | Versión | Fuente |
|---|---|---|---|
| UI | React | ^19.2.7 | `package.json` |
| Lenguaje | TypeScript | ~6.0.2 | `package.json` |
| Bundler/dev server | Vite | ^8.1.1 | `package.json` |
| Routing | react-router-dom | ^7.18.1 | `package.json` (⚠️ el PRD pide TanStack Router — divergencia deliberada, documentada en CLAUDE.md como "reconciliar deliberadamente, no por accidente") |
| Estilos | Tailwind CSS | ^4.3.2 (`@tailwindcss/vite`, sin `tailwind.config.js`) | `package.json` |
| Backend/DB | Supabase JS | ^2.110.0 | `package.json` |
| PWA | vite-plugin-pwa | ^1.3.0 | `package.json` |
| Linter | oxlint | ^1.71.0 | `package.json` (⚠️ no ESLint, pese a que las reglas globales del usuario asumen ESLint por defecto — este proyecto usa la alternativa Rust-based) |
| Utilidad | jszip | ^3.10.1 | `package.json` — usado en `lib/tradeExport.ts` (export de trades, inferido) |
| CLI de infra | supabase (CLI) | ^2.109.0 | `package.json` devDependency |

**Previsto por el PRD pero no implementado todavía** (divergencia documentada, no un
error): TanStack Query, TanStack Router, React Hook Form, Zod, Shadcn UI, Recharts,
Framer Motion. El código actual usa `useState`/`fetch` directo contra Supabase en vez de
TanStack Query, formularios controlados a mano en vez de React Hook Form+Zod, y CSS
utilitario a mano en vez de Shadcn. Esto es coherente con el aviso explícito en
CLAUDE.md: "note the current code already diverges from the PRD stack... reconcile
deliberately rather than by accident."

## Servicios externos detectados

| Servicio | Uso | Evidencia |
|---|---|---|
| Supabase Cloud (proyecto `pcmftbzpzeliurrnyidt`) | Postgres, Auth, Storage, Edge Functions en producción | CLAUDE.md, `.vercel/` |
| Vercel | Hosting del frontend + auto-deploy desde `main` | CLAUDE.md, `.vercel/project.json` |
| Groq | Proveedor de IA por defecto (modelo gratuito GPT OSS 20B) | CLAUDE.md, `ai_provider_config` |
| OpenAI/Anthropic/Gemini/DeepSeek/OpenRouter/Ollama/LM Studio | Proveedores alternativos vía BYOK | PRD — adaptador `AIProvider`, no confirmado cuáles están realmente implementados en `supabase/functions/analyze-trade` sin leer ese código a fondo |
| Fuente de noticias externa | Poblar `news_articles` | Edge Function `fetch-news` — proveedor exacto no confirmado sin leer el código de la función |
| Mailpit/Inbucket (solo local) | Bandeja de prueba para emails de confirmación/reset | CLAUDE.md, puerto `55324` |

## ⚠️ Pendiente de validación humana

- No se auditó el contenido interno de `supabase/functions/analyze-trade`,
  `extract-trade-image`, ni `fetch-news` en esta sesión (fuera de alcance de esta
  auditoría de documentación) — las afirmaciones sobre proveedores soportados vienen del
  PRD, no de una lectura línea por línea del código de las Edge Functions.
