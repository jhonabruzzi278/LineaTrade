# Incident Runbooks

No existen runbooks formales en el repo. Lo que sigue son los **incidentes/problemas
reales ya vividos y resueltos**, documentados en `CLAUDE.md`, reformateados aquí como
runbook — son la base más honesta posible para runbooks futuros porque ya ocurrieron de
verdad, no son hipotéticos.

## "Docker no puede bindear los puertos de Supabase local en Windows"

**Síntoma:** `supabase start` falla con `bind: An attempt was made to access a socket in
a way forbidden by its access permissions`.

**Causa raíz:** Windows/Hyper-V reserva dinámicamente rangos de puertos TCP; el rango
por defecto de Supabase (54321-54329) puede caer dentro de una reserva activa.

**Diagnóstico:** `netsh interface ipv4 show excludedportrange protocol=tcp` — confirmar
si el rango en conflicto está excluido.

**Resolución:** este repo ya movió el rango a 55321-55329 en `supabase/config.toml` (ver
[ADR-003](../design-artifacts/ADR/ADR-003-local-supabase-port-range.md)). Si el conflicto
reaparece en una máquina nueva, mover el rango de nuevo en vez de forzar el original vía
cambios de sistema — es la solución ya validada, no re-litigar el diagnóstico.

## "PostgREST sirve un schema desactualizado después de una migración en producción"

**Síntoma:** una migración se aplicó correctamente a Supabase Cloud, pero las queries
desde el cliente siguen fallando o ignorando columnas/tablas nuevas.

**Causa raíz:** PostgREST cachea el schema y no siempre lo refresca automáticamente tras
un `db push` contra Cloud.

**Resolución:** commit `d122b06` y la migración
`20260719173629_refresh_postgrest_schema_cache.sql` — existe una migración dedicada solo
para forzar el refresh. Si vuelve a pasar tras una migración futura, aplicar el mismo
patrón (una migración vacía/trivial que fuerce el reload) en vez de re-diagnosticar desde
cero.

## "Rate limiting de IA falla con columna ambigua" (ya corregido, patrón a vigilar)

**Causa raíz:** `check_and_increment_ai_usage` tenía una referencia de columna ambigua
entre el parámetro de la función y una columna de la tabla del mismo nombre — típico en
funciones SQL con parámetros nombrados igual que columnas.

**Lección aplicable a futuras funciones SQL de este proyecto:** prefijar parámetros de
función (`p_user_id` en vez de `user_id`) cuando el nombre coincide con una columna de la
tabla que la función consulta, para que Postgres nunca tenga que desambiguar.

## "Groq devuelve respuestas vacías"

**Causa raíz:** `reasoning_effort` sin acotar en la llamada al proveedor.

**Resolución:** commit `5c59faa` — acotar el parámetro. Si se agrega un proveedor nuevo
vía el adaptador `AIProvider`, revisar sus parámetros de "esfuerzo de razonamiento" o
equivalente antes de asumir que el default del proveedor es seguro.

## ⚠️ Sin runbook para (pendiente, priorizado por severidad si ocurriera)

- Filtración de datos cross-usuario (ninguno de los 3 bugs de RLS reales llegó a
  producción con datos reales expuestos, según lo documentado — pero no hay un runbook
  de "qué hacer si un usuario reporta ver datos de otro" hoy).
- Caída de Supabase Cloud o Vercel — no hay página de estado propia ni plan de
  comunicación a usuarios documentado.
