# Lineatrader — Plan de Implementación

Estado a la fecha: validación visual del onboarding en curso. Nada conectado a backend real todavía — decisión deliberada para validar UX rápido antes de comprometer datos reales.

---

## Fase 0 — Validación visual del Onboarding (en curso)

| Pantalla | Estado | Notas |
|---|---|---|
| Landing | ✅ Construida | Hero + traza animada + sección de bitácora (4 principios) |
| Registro | ✅ Construida | Formulario funcional localmente, sin backend aún |
| Login | ✅ Construida | Formulario funcional localmente, sin backend aún |
| Recuperar contraseña | ⬜ Pendiente | Falta construir |
| **Deploy a Vercel** | ⬜ **Pendiente de ti** | Zip entregado — corre `vercel deploy` con tu cuenta cuando quieras verlo en vivo |

**Decisión abierta:** ¿construimos "Recuperar contraseña" ahora para cerrar el onboarding completo, o la dejamos para cuando conectemos Supabase Auth real (donde tiene más sentido, porque el flujo de recuperación depende 100% del backend)?

---

## Fase 1 — Resto de pantallas privadas (mock data, sin backend)

Una vez valides el onboarding en Vercel, el siguiente bloque natural es el **loop diario** — las pantallas que más va a usar el trader:

1. Dashboard (cards configurables, resumen, acceso rápido a "Nuevo Trade")
2. Formulario "Nuevo Trade" (el más largo — datos técnicos, contexto, psicología, aprendizaje)
3. Detalle de Trade (vista de un trade guardado + hilo de seguimiento)
4. Historial / listado de trades

Todo con datos mock **usando exactamente los tipos TypeScript ya definidos** en `trade-journal-os-schema.md` y `trade-journal-os-context-engine.md` — así la migración a datos reales después es un cambio de fuente de datos, no una reescritura.

---

## Fase 2 — Backend real (Supabase)

Recién aquí conectamos de verdad:

1. Crear el proyecto de Supabase.
2. Aplicar el schema completo (`trade-journal-os-schema.md`) vía migraciones.
3. Generar tipos TypeScript desde el schema (`supabase gen types typescript`) — reemplazan los tipos mock manuales.
4. Conectar Auth real (registro/login/recuperación pasan a ser funcionales de verdad).
5. Conectar el CRUD de `trades` al Dashboard y formularios ya construidos en la Fase 1.
6. Configurar Storage para imágenes de trades.

---

## Fase 3 — Motor de IA

1. Desplegar la Edge Function que construye el contexto (`trade-journal-os-context-engine.md`).
2. Configurar `ai_provider_config` con Groq / GPT OSS 20B como default.
3. Conectar el botón "Analizar con IA" en el Detalle de Trade.
4. Implementar el rate limiting (`ai_usage_daily`) y BYOK.

---

## Fase 4 — Panel SuperAdmin y Observabilidad

1. Módulos del panel admin (Usuarios, Gestión de IA, Auditoría).
2. Sentry + PostHog con la taxonomía de eventos ya definida.
3. Edge Function auditada para acceso de soporte a trades ajenos.

---

## Próxima decisión inmediata

Antes de seguir escribiendo código, necesito que confirmes **una** de estas dos rutas:

- **A.** Cerrar Fase 0 primero (construir "Recuperar contraseña" con UI mock, dejar el onboarding 100% completo) y recién ahí pasar a Fase 1.
- **B.** Saltar directo a Fase 1 (Dashboard + Nuevo Trade) y dejar "Recuperar contraseña" pendiente para cuando conectemos Supabase real, ya que hoy no podría funcionar de verdad de todas formas.
