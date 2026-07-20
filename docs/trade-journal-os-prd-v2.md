# LineaTrade — PRD Técnico Consolidado

**Versión:** 2.0 (post-arquitectura)
**Estado:** Listo para iniciar desarrollo — **nota 2026-07-19:** el MVP de la sección 7
ya está construido casi por completo (Sentry/PostHog son la única pieza pendiente). El
producto real también incluye módulos que no forman parte de este PRD en absoluto
(trading de opciones, tickets de orden, extracción de trade por foto vía IA, Noticias,
Sistema de objetivos/reglas/estrategias, Perfil con avatar, IA Trader/quiz de plan) —
ver `CLAUDE.md` → "Beyond Fase 4" para el detalle. Este documento sigue describiendo el
diseño original; no se reescribió para retroactivamente incluir ese trabajo posterior.
**Documentos relacionados:** `trade-journal-os-schema.md` (schema completo de Supabase), `trade-journal-os-context-engine.md` (motor de contexto de IA)

---

## 1. Resumen Ejecutivo

LineaTrade es un sistema Mobile First para que traders registren operaciones y reciban interpretación basada en evidencia — nunca señales, nunca predicciones, nunca asesoría financiera. La IA actúa como coach de comportamiento: el backend calcula, la IA interpreta, y toda afirmación cuantitativa debe rastrearse hasta un dato real.

**Lema:** *"No ayudamos a los traders a ganar más dinero. Les ayudamos a cometer menos errores."*

---

## 2. Principios del Producto (no negociables)

1. **La IA nunca inventa.** Toda cifra que mencione debe existir literalmente en el contexto estructurado que se le entrega. Si no hay evidencia suficiente, lo dice explícitamente — esto es una regla de código verificable (`data_sufficiency`), no una instrucción de buena fe.
2. **El backend calcula, la IA interpreta.** Ningún porcentaje, ratio o estadística sale del LLM; siempre de vistas SQL.
3. **El usuario controla sus datos.** Sin redes sociales, sin rankings, sin compartir entre usuarios. Acceso de soporte del SuperAdmin siempre auditado, nunca silencioso.
4. **El Journal es la única fuente de verdad.** Ningún análisis se basa en opiniones generales de trading.
5. **Mobile First.** Registrar un trade debe tomar menos de un minuto.

---

## 3. Decisiones de Arquitectura Tomadas (resumen ejecutivo por módulo)

### 3.1 Modelo de costos de IA — Híbrido
- **Tier gratuito:** modelo por defecto **GPT OSS 20B vía Groq** (~$0.0002/análisis). Límite: **3 análisis/día por usuario**. Contexto truncado a 2.000 tokens, salida a 500 tokens.
- **BYOK:** el usuario configura su propia API key (cualquier proveedor soportado); sin límite diario, costo asumido por él.
- **Presupuesto objetivo:** <$20/mes en tier gratuito incluso en el peor caso (500 usuarios saturando el límite diario) — con GPT OSS 20B el peor caso real ronda ~$5-16/mes, dejando margen.
- **Alerta de costo:** `pg_cron` cada hora, notifica si el gasto proyectado del día supera 70% del presupuesto mensual.
- **Nunca hardcodear el modelo/proveedor** — todo vive en `ai_provider_config`, editable sin deploy.

### 3.2 Arquitectura de proveedor de IA
Adaptador propio (interfaz `AIProvider`) que soporta SDKs oficiales + OpenRouter + self-hosted (Ollama/LM Studio) bajo la misma interfaz. Rate limiting vía tabla Postgres (`ai_usage_daily`), no Redis — innecesario a este volumen.

### 3.3 Knowledge Graph — descartado
Postgres relacional normalizado + `pgvector` para similitud semántica (activado solo para usuarios con >500 trades) cubre el caso de uso sin la complejidad operativa de un grafo dedicado.

### 3.4 Integridad del Journal
- Edición de trades **libre en cualquier momento** (decisión de UX), pero con **audit trail automático** vía trigger de Postgres (`trade_history`) que registra cambios en campos críticos (entry, exit, SL, TP) sin pedirle nada extra al usuario.
- `moved_stop_loss` es autoreportado (checkbox), pero **viaja junto al dato objetivo** (`trade_history`) — la discrepancia entre percepción y realidad es, en sí misma, una señal psicológica valiosa.
- Cada análisis de IA guarda un **snapshot JSONB inmutable** del trade — nunca queda desincronizado si el trade se edita después.
- Catálogo de instrumentos: precargado (forex majors, top cripto, acciones comunes) + custom por usuario vía RLS.

### 3.5 Motor de Contexto de IA
Contexto construido en 4 capas (agregados SQL / snapshot del trade / historial relevante / metadatos de control), **nunca concatenación de texto libre**. Defensa anti-prompt-injection mediante separación estructural estricta entre `DATOS_ESTRUCTURADOS` (fuente de verdad) y `TEXTO_DEL_USUARIO` (nunca instrucciones). Salida forzada a JSON estructurado con `facts_cited` — cada afirmación debe enlazar a un campo real del contexto, permitiendo detectar alucinaciones programáticamente. Ver `trade-journal-os-context-engine.md` para el detalle completo.

### 3.6 Panel de SuperAdmin
Módulos independientes (feature-based): Overview/Crecimiento, Usuarios, Soporte/Acceso a Trades, Gestión de IA, Salud del Sistema, Auditoría, Configuración Global.

**Corrección crítica al diseño original:** el acceso del SuperAdmin a trades ajenos **no puede ser una policy RLS de lectura directa** — eso permite acceso sin registro. El único camino válido es una Edge Function con `service_role` que registra el acceso en `audit_log` *antes* de devolver los datos. Sin registro, no hay datos.

### 3.7 Observabilidad
Tres capas separadas: Sentry (errores técnicos), PostHog (comportamiento de producto, vía interfaz propia `AnalyticsEvent` para poder migrar a OTel/Grafana sin reescribir código), `audit_log` (seguridad/compliance). Taxonomía fija de ~12 eventos de MVP (ver sección 6). Si se activa Session Replay en PostHog: **máscara total de inputs por defecto** — nunca capturar `pnl_amount`, `reflection`, ni datos psicológicos en herramientas de terceros.

---

## 4. Stack Técnico

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn UI, React Hook Form, Zod, TanStack Query, TanStack Router, Recharts, Framer Motion.

**Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime limitado a notificación de análisis de IA completado, Edge Functions, RLS).

**IA:** Adaptador propio multi-proveedor (OpenAI, Anthropic, Gemini, Groq, DeepSeek, OpenRouter, Ollama, LM Studio). Modelo por defecto tier gratuito: GPT OSS 20B vía Groq.

**Observabilidad:** Sentry + PostHog (MVP) → OTel + Grafana/Prometheus (v2+, solo si el volumen lo justifica).

---

## 5. Modelo de Datos — Resumen

Schema completo con SQL, RLS, triggers e índices en `trade-journal-os-schema.md`. Entidades principales:

| Tabla | Propósito |
|---|---|
| `profiles` | Usuarios y roles (trader / superadmin) |
| `instruments` | Catálogo global + custom por usuario |
| `strategies`, `trader_rules` | Configuración del trader |
| `trades` | Núcleo del sistema — datos técnicos, contexto, psicología, aprendizaje |
| `trade_history` | Audit trail automático de campos críticos (vía trigger) |
| `trade_images` | Referencias a Storage, RLS por carpeta de usuario |
| `trade_threads` | Hilos de seguimiento post-cierre |
| `objectives` | Metas medibles del trader |
| `ai_provider_config` | Configuración de proveedores (solo SuperAdmin) |
| `user_ai_settings` | BYOK por usuario, keys cifradas con `pgsodium` |
| `ai_usage_daily` | Contador de uso para rate limiting |
| `ai_prompts` | Prompts versionados, editables sin deploy |
| `ai_analysis` | Resultado de análisis con snapshot inmutable |
| `audit_log` | Registro de acciones sensibles a nivel de sistema |

---

## 6. Taxonomía de Eventos de Producto (MVP)

`signup_started` · `signup_completed` · `email_confirmed` · `profile_completed` · `strategy_created` · `first_trade_logged` · `trade_saved` · `ai_analysis_requested` · `ai_analysis_completed` · `ai_limit_reached` · `rule_violation_flagged` · `objective_achieved`

Convención: `dominio_accion`, snake_case. Nunca incluir datos financieros/psicológicos como propiedad del evento — solo el hecho de que ocurrió.

---

## 7. Roadmap por Fases

### MVP
- Auth completo (registro, login, recuperación, perfil).
- Journal completo (CRUD de trades, imágenes, hilos).
- Dashboard configurable por cards.
- Estadísticas determinísticas (vistas SQL de la sección 2 del context engine).
- Motor de IA con tier gratuito + BYOK.
- Panel SuperAdmin: Usuarios, Gestión de IA, Auditoría básica.
- Sentry + PostHog con taxonomía de eventos fija.
- Audit trail automático en trades (trigger, invisible para el usuario).

### v1.1
- Panel SuperAdmin: Soporte/Acceso a Trades con Edge Function auditada.
- Salud del Sistema (healthcheck vía `pg_cron`).
- Notificación al usuario de acceso de soporte a su journal (evaluar si se activa).
- Alertas de costo de IA vía email.

### v1.5
- Retrieval semántico (`pgvector`) para usuarios con historial grande (>500 trades).
- Memoria evolutiva del trader (comparación de comportamiento entre periodos).
- Embudos de producto en PostHog (onboarding → primer trade → primer análisis IA).

### v2
- Evaluación comparativa entre modelos de IA (A/B de prompts/proveedores usando `ai_prompts` versionado).
- Observabilidad avanzada (OTel + Grafana) si el volumen de usuarios lo justifica.
- Particionamiento de `audit_log` y `ai_usage_daily` por fecha si el volumen lo requiere.

---

## 8. Principios de Ingeniería para el Código

Clean Architecture, SOLID, DRY, KISS, YAGNI. Vertical Slice / feature-based folders cuando aporte claridad. Tipado estricto de extremo a extremo (tipos generados desde el schema de Supabase, no mantenidos a mano). Testing desde el diseño, no como añadido posterior.

**Orden real de construcción recomendado (corrige el orden original del meta-prompt):** el schema de Supabase y los tipos generados son el contrato — el frontend se construye contra ese contrato desde el inicio, no contra datos mockeados a mano, para evitar divergencia schema↔UI.

---

## 9. Preguntas Abiertas (pendientes de decidir antes de esos módulos específicos)

- ¿El catálogo global de `instruments` lo edita solo el SuperAdmin, o se permite alguna forma de contribución comunitaria (siendo open source)?
- ¿Se activa notificación al usuario sobre acceso de soporte en v1.1, o se mantiene solo auditoría interna indefinidamente?
- Sistema de diseño y arquitectura de componentes del frontend — módulo pendiente si se quiere profundizar antes de construir.

---

## 10. Visión a Largo Plazo

LineaTrade no es un diario de operaciones. Es un sistema de mejora continua basado en evidencia. El objetivo no es registrar trades — es construir un historial confiable que permita al trader entender cómo piensa, cómo ejecuta y cómo evoluciona, con cada pieza de la arquitectura (audit trail, contexto determinístico, salida estructurada citando evidencia) diseñada para que esa evidencia sea real y verificable, no una promesa de marketing.
