# Architecture Overview

## Estructura del proyecto (árbol real, resumido)

```
src/
├── App.tsx                 # Router único (react-router-dom v7), 17 rutas, 12 protegidas
├── main.tsx                 # Monta <App/> envuelto en <AuthProvider/>
├── index.css                 # Sistema de diseño: tokens @theme de Tailwind v4
├── pages/                    # 17 páginas, export default, una por ruta
├── components/               # Compartidos (Nav, AppHeader, WizardLayout, ProtectedRoute,
│                                SuperAdminRoute, AppFloatingNav, Avatar, Switch,
│                                PwaUpdatePrompt, SourceAvatar, SettingsRow)
│   ├── ui/                    # Primitivas shadcn/Radix + floating-navbar.tsx (píldora de nav)
│   ├── trade/                # BrokerPicker, TechnicalEntryPanel, PsychologySection,
│   │                            OrderTicketFields
│   ├── sistema/               # ObjectivesSection, RulesSection, StrategiesSection
│   ├── traderQuiz/             # QuizStep, PlanReport
│   └── icons/                  # NavIcons, TradeIcons (hand-picked, currentColor)
├── lib/                       # Todo lo backend-facing: supabase.ts, auth.tsx, errors.ts,
│                                 instruments.ts, tradeImages.ts, tradeImport.ts,
│                                 tradeImageExtraction.ts, tradeExport.ts, tradeDisplay.ts,
│                                 aiAnalysis.ts, avatarUpload.ts, news.ts,
│                                 traderPlanEngine.ts, traderQuizStorage.ts,
│                                 traderPackage.ts, binancePriceHistory.ts, toast.tsx
├── data/                      # Contenido estático: brokers.ts, onboarding.ts, traderQuiz.ts
├── hooks/                      # useWizard.ts
└── types/database.ts           # GENERADO desde el schema — nunca editar a mano

supabase/
├── config.toml                 # Puertos movidos a 5532x (limitación real de Windows/Hyper-V)
├── migrations/                  # 34 archivos, uno por cambio incremental de schema
├── seed.sql                      # Catálogo inicial de instruments
└── functions/                     # analyze-trade, extract-trade-image, fetch-news, _shared

docs/                            # Fuente de verdad del producto (PRD, schema, context
                                    engine, plan de implementación) — anterior al código
                                    en el caso del PRD/schema, posterior/vivo en el caso
                                    del plan de implementación
CLAUDE.md                         # Guía de arquitectura para asistentes de IA — la más
                                    detallada y actualizada de las fuentes, aunque con
                                    drift real frente al código más reciente (ver
                                    00_PROJECT_METADATA.md)
```

## Tech Stack (capa por capa)

| Capa | Tech | Justificación (documentada o inferida) | Fuente |
|---|---|---|---|
| UI | React 19 + TS | `ref` como prop plano, sin `forwardRef` | CLAUDE.md |
| Estilos | Tailwind v4 (`@theme`, sin config file) | Todos los tokens de color/tipografía centralizados en `index.css` — "no hardcodees hex en componentes" | CLAUDE.md, verificado en README |
| Routing | react-router-dom v7 | Divergencia deliberada del PRD (que pedía TanStack Router) | CLAUDE.md |
| Estado servidor | Ninguna librería — `fetch` directo vía cliente Supabase | Divergencia del PRD (que pedía TanStack Query) | Inferido de ausencia en `package.json` |
| Backend | Supabase (Postgres 17, Auth, Storage, Edge Functions) | RLS en el 100% de las tablas, "el journal es la única fuente de verdad" | schema doc, CLAUDE.md |
| IA | Adaptador multi-proveedor propio (`AIProvider`), Groq por defecto | Nunca hardcodear modelo/proveedor — vive en `ai_provider_config` | PRD, CLAUDE.md |
| Hosting | Vercel (build-time env vars, auto-deploy desde `main`) | Proyecto Vercel en cuenta/team distinta de la sesión CLI local | CLAUDE.md |
| Observabilidad | **Ninguna** (Sentry/PostHog en el plan, no implementados) | — | CLAUDE.md lo admite explícitamente |

## Decisiones arquitectónicas detectadas

- **Monolito de un solo esquema Postgres**, no microservicios — coherente con la escala
  actual del producto (un solo equipo, un solo dominio de negocio).
- **Sync por defecto, async solo donde el negocio lo exige** — la única asincronía real
  de negocio son las Edge Functions de IA (análisis, extracción de imagen, noticias);
  todo el CRUD de trades es síncrono request/response contra Postgres vía PostgREST.
- **El cliente nunca calcula hechos de negocio** — el patrón más repetido y más
  deliberado de toda la arquitectura (PnL/R vía trigger, stats vía vista, rate limit vía
  función atómica). Cualquier feature nueva que calcule algo financiero en el cliente
  contradice este principio explícitamente.
- **RLS + grants explícitos, nunca `anon`** — el producto no tiene superficie pública de
  datos; toda tabla otorga privilegios solo a `authenticated`, verificado con una request
  anónima real rechazada.
- **Vault para secretos de usuario (BYOK), nunca en la tabla en texto plano** — mismo
  principio aplicado a datos sensibles del usuario, no solo a infraestructura.
