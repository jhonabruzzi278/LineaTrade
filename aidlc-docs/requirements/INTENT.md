# Project Intent

## High-Level Purpose

Extraído literalmente de `README.md` y `CLAUDE.md` (no inferido — el proyecto lo declara
explícitamente):

> "No ayudamos a los traders a ganar más dinero. Les ayudamos a cometer menos errores."

LineaTrade es una bitácora de trading mobile-first donde el trader registra sus
operaciones (técnica, contexto, psicología) y el sistema le devuelve interpretación
basada en evidencia de sus propios datos — explícitamente **no** una herramienta de
señales, predicciones, o asesoría financiera.

## Business Objectives

Del PRD (`docs/trade-journal-os-prd-v2.md`) y los "Non-negotiable principles" en
CLAUDE.md:

1. Ayudar al trader a detectar sus propios patrones de comportamiento (ej. mover el
   stop-loss repetidamente sin reportarlo — implementado literalmente en
   `TradeDetail.tsx`, que cruza `trade_history` contra la auto-declaración del usuario).
2. Mantener una posición de producto defendible legal/éticamente: nunca calcular ni
   inventar cifras vía IA; toda estadística sale de SQL determinístico
   (`v_user_trade_stats`, `v_user_stats_by_strategy`, `v_user_stats_by_emotion`,
   `v_rule_violations`).
3. Monetización vía BYOK (Bring Your Own Key) para desbloquear límite de análisis de IA —
   visible en `ConfiguracionIA.tsx` y las RPCs `set_provider_api_key`/`get_byok_status`.
   ⚠️ No hay documento de pricing/planes de suscripción explícito — pendiente validación
   humana si existe un modelo de negocio más allá de BYOK.

## Success Metrics

⚠️ **No documentado explícitamente en ningún archivo del repo.** No hay definición de
KPIs de producto (retención, trades registrados por usuario, etc.) en `docs/` ni en
código. Los únicos "success signals" que existen son técnicos, no de negocio:
`get_system_metrics()` (usado por `/admin`) expone conteos agregados de usuarios/trades/
uso de IA — es una fuente de datos posible para métricas de negocio, pero no hay un
documento que defina qué número importa o por qué. **Pendiente input del Product Owner.**

## Constraints

### Technical

- Stack real y verificado (`package.json`): React 19, TypeScript 6 (`~6.0.2`), Vite 8,
  Tailwind CSS v4, react-router-dom v7, Supabase JS v2, oxlint (no ESLint).
- PWA instalable (`vite-plugin-pwa`) — service worker deliberadamente nunca cachea
  llamadas a Supabase (dato financiero/de sesión, debe ser siempre fresco).
- Copy exclusivamente en español (audiencia LatAm) — constraint de producto, no técnico,
  pero enforced en código (`Noticias.tsx` fuerza fuentes en español, según commit
  `04d314b`).
- Todas las tablas tienen RLS activado sin excepción (`docs/trade-journal-os-schema.md`,
  regla explícita, verificada en CLAUDE.md contra la base real).
- Puertos locales de Supabase movidos de 5432x a 5532x por una limitación real de
  Windows/Hyper-V — ver `design-artifacts/ADR/` para el registro de esta decisión.

### Business

- Sin funciones sociales, sin rankings, sin compartir datos entre usuarios — principio
  no negociable #3 en CLAUDE.md, con enforcement técnico real (RLS + auditoría de acceso
  de soporte vía Edge Function con `service_role`, nunca policy silenciosa).
- ⚠️ Presupuesto, timeline, y modelo de negocio más allá de BYOK: no documentados —
  pendiente validación humana.
