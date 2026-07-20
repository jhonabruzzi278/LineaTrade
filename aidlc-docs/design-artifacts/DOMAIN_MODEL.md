# Domain Model (DDD)

Extraído de `src/types/database.ts` (generado desde el schema real de Supabase — fuente
de verdad, no hand-maintained) y `docs/trade-journal-os-schema.md`. Actual como de
2026-07-19: **18 tablas + 4 vistas**, no las "15 tablas" que `CLAUDE.md` documenta —
CLAUDE.md quedó desactualizado antes de que se agregaran `news_articles`, `trade_orders`,
`trader_plans`, `user_ai_settings`, y `ai_prompts`. Ver nota de drift en
`00_PROJECT_METADATA.md`.

## Bounded Context: Trading Journal (contexto único — no hay separación de bounded
contexts en el código; todo vive en un solo esquema `public`)

### Aggregates identificados

**`Trade`** (Aggregate Root) — tabla `trades`
- Identidad: `id`
- Pertenece a: `profiles` (owner, vía `user_id`, RLS-scoped)
- Referencia: `instruments` (catálogo resuelto o creado en `lib/instruments.ts`)
- Invariante fuerte: `pnl_amount`/`pnl_r` **nunca** se escriben desde el cliente — solo
  el trigger `trg_calculate_trade_pnl` los produce, y solo cuando `status` pasa a
  `'closed'` con `exit_price` no nulo.
- Entidades hijas / value objects asociados:
  - `trade_history` — log de auditoría inmutable de cambios de campo (ej. `stop_loss`
    movido), generado por trigger, nunca escrito directamente por la app.
  - `trade_images` — Value Object de adjunto (`stage: 'before'|'during'|'after'`,
    `storage_path`), sin URL pública — toda lectura pasa por `getSignedImageUrl()`.
  - `trade_threads` — comentarios de seguimiento, mutables solo por inserción (no hay
    edición/borrado documentado).
  - `trade_orders` — detalle de ticket de orden (agregado más reciente, sin
    documentación explícita en `docs/`, inferido del nombre y de `OrderTicketFields.tsx`).

**`Profile`** (Aggregate Root) — tabla `profiles`
- Identidad: `id` (1:1 con `auth.users`, gestionado por Supabase Auth, no por esta app)
- Value Object: `role` (`'user' | 'superadmin'` — enforcement vía `is_superadmin()`,
  `security definer` para evitar la recursión de RLS documentada en CLAUDE.md)
- Campos de onboarding (`onboarding_done`, respuestas del quiz) — extendidos en
  `20260701221500_profiles_onboarding_fields.sql`.

**`Instrument`** (Entidad, no Aggregate Root propio) — tabla `instruments`
- Catálogo compartido (forex/cripto/acciones/futuros/opciones/otro), resuelto o creado
  al vuelo por `resolveInstrumentId()` — evita duplicados por símbolo+categoría.

**`AiAnalysis`** (Aggregate Root) — tabla `ai_analysis`
- Snapshot JSONB inmutable del trade en el momento del análisis — el diseño explícito
  es que el análisis se mantenga coherente aunque el trade se edite después.
- Relacionado: `ai_prompts` (versión del prompt usado), `ai_provider_config` (qué
  modelo/proveedor, nunca hardcodeado en código), `ai_usage_daily` (rate limit, atómico),
  `user_ai_settings` (BYOK — clave leída de Vault vía `read_vault_secret`, nunca en
  texto plano al cliente).

**`TraderSystem`** (agrupación conceptual, no un aggregate único en el schema) —
tablas `objectives`, `trader_rules`, `strategies`
- El trader define su propio marco de disciplina; `v_rule_violations` (vista) cruza
  reglas declaradas contra comportamiento real registrado.

**`TraderPlan`** (Aggregate Root) — tabla `trader_plans`
- Resultado persistido del quiz de `traderPlanEngine.ts` — inferido del nombre de tabla
  y del flujo en `PlanReport.tsx`; sin documentación de dominio en `docs/`.

**`NewsArticle`** (Entidad, catálogo de solo lectura para el usuario) — tabla
`news_articles`
- Poblada por la Edge Function `fetch-news`, no por el usuario — es contenido curado,
  no generado por el trader.

**`AuditLog`** (Aggregate Root, write-only desde la perspectiva de la app) — tabla
`audit_log`
- Sin policy de `insert` para usuarios normales (CLAUDE.md lo confirma) — solo
  Edge Functions `service_role` escriben aquí, específicamente para acceso de soporte a
  datos de otro usuario.

### Domain Events

No hay un sistema de eventos/pub-sub explícito (ej. no hay tabla `domain_events` ni
`pg_notify` documentado más allá de "Realtime limitado a notices de 'análisis de IA
listo'" en el PRD — no confirmado en migraciones actuales). El "audit trail" de
`trade_history` funciona como un log de eventos de dominio de facto (append-only, vía
trigger), pero no está modelado como Domain Event con nombre/tipo explícito.

### Repositories

No hay una capa de Repository explícita (patrón no usado) — el acceso a datos es directo
vía el cliente tipado de Supabase (`src/lib/supabase.ts`) desde cada página/componente.
Esto es una desviación deliberada de bajo riesgo para un proyecto de este tamaño, no un
defecto — pero si el proyecto crece, `lib/` sería el lugar natural para introducir
repositorios si la duplicación de queries se vuelve un problema real (YAGNI por ahora).
