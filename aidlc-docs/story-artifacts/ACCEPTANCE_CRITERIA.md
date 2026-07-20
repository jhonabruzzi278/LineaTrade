# Acceptance Criteria

Criterios reconstruidos a partir de comportamiento ya verificado end-to-end (citado
literalmente de `CLAUDE.md`, que documenta una verificación manual real, no solo
compilación) más los invariantes de negocio explícitos en `docs/`.

## Cierre de trade (verificado a mano, ejemplo real documentado)

- **Dado** un trade abierto con `entry=3000`, `stop_loss=2900`, `qty=2`, `commission=5`,
  **cuando** se cierra con `exit_price=3300`,
  **entonces** `pnl_amount = 595` y `pnl_r = 2.975` — calculados por el trigger de
  Postgres, nunca enviados por el cliente.
- **Dado** un trade cerrado en pérdida sin `stop_loss` capturado,
  **entonces** `pnl_amount` es no-nulo pero `pnl_r` es `null` (no hay unidad de riesgo
  contra la cual normalizar) — y la UI debe mostrar honestamente ese vacío, nunca un
  fallback al precio de entrada (bug real corregido, documentado en CLAUDE.md — mostrar
  el precio de entrada en un trade *cerrado* sin R se leía como neutral/positivo cuando
  en realidad fue una pérdida).

## Seguridad de datos (RLS) — verificado contra la base real

- **Dado** un usuario autenticado sin sesión de soporte,
  **cuando** consulta cualquier tabla,
  **entonces** solo ve sus propias filas — enforced por RLS + `security_invoker = true`
  en toda vista sobre una tabla con RLS.
- **Dado** una request anónima (sin sesión) a `/rest/v1/trades` o a un objeto del bucket
  privado `trade-images`,
  **entonces** la request es rechazada con `permission denied` — verificado con una
  request real sin sesión, no asumido.
- **Dado** el SuperAdmin accediendo a datos de otro usuario,
  **entonces** el acceso pasa por una Edge Function `service_role` que escribe en
  `audit_log` **antes** de devolver los datos — nunca una policy RLS silenciosa.

## IA — anti-alucinación

- **Dado** cualquier respuesta de análisis de IA,
  **entonces** cada cifra citada debe existir literalmente en el contexto estructurado
  (`DATOS_ESTRUCTURADOS`) entregado al modelo — la salida se fuerza a JSON con
  `facts_cited`, haciendo la alucinación programáticamente detectable.
- **Dado** las notas de texto libre del usuario (`TEXTO_DEL_USUARIO`),
  **entonces** nunca se tratan como instrucciones para el modelo — separación estructural
  como defensa contra prompt injection, no un filtro de palabras clave.
- **Dado** un usuario sin BYOK que ya usó sus 3 análisis gratis del día,
  **entonces** la cuarta solicitud es rechazada por `check_and_increment_ai_usage` de
  forma atómica (sin condición de carrera entre requests concurrentes).

## Imágenes

- **Dado** un archivo que no es `image/*` o supera 5MB,
  **entonces** se rechaza en el cliente antes de cualquier llamada de red.
- **Dado** una subida exitosa,
  **entonces** el path sigue exactamente
  `{user_id}/{trade_id}/{stage}_{timestamp}_{sanitized_filename}` — requerido por la
  policy de Storage, no solo convención.
- **Dado** que el bucket es privado,
  **entonces** toda visualización pasa por una signed URL con TTL de 1 hora, generada al
  cargar la página, nunca persistida.

## ⚠️ Pendiente de validación humana

- No hay criterios de aceptación documentados para: IA Trader, el flujo completo de
  import CSV (más allá de "está bloqueado al guardar"), ni para el motor de
  recomendación de `traderPlanEngine.ts` (qué inputs producen qué planes no está
  especificado en ningún doc, solo en el código).
