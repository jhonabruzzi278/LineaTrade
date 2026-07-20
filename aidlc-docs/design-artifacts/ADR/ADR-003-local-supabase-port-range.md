# ADR-003: Mover los puertos locales de Supabase de 5432x a 5532x

**Estado:** Aceptado (ya implementado en `supabase/config.toml`)
**Fecha de la decisión:** documentada en CLAUDE.md, sección "Local ports are non-default"

## Contexto

El rango de puertos por defecto de Supabase CLI (54321-54329) cayó dentro de un rango
que Windows/Hyper-V reserva dinámicamente en esta máquina de desarrollo (verificable con
`netsh interface ipv4 show excludedportrange protocol=tcp`). Docker no podía bindear ahí
(`bind: An attempt was made to access a socket in a way forbidden by its access
permissions`) — un error de plataforma, no de configuración de Supabase ni del proyecto.

## Decisión

Mover todo el bloque de puertos locales a 55321-55329 en `supabase/config.toml`, en vez
de intentar forzar el rango original vía cambios de sistema (`netsh`) que serían más
invasivos y no portables a otras máquinas del equipo.

## Consecuencias

- Positivo: el fix vive en el repo (`config.toml`), así que cualquier colaborador con el
  mismo problema de Windows/Hyper-V lo hereda automáticamente al clonar — no requiere
  que cada desarrollador repita el diagnóstico.
- Negativo: cualquier documentación o script que asuma el puerto 54321 por defecto
  (documentación externa de Supabase, ejemplos genéricos) no aplica directamente a este
  repo — `npm run db:status` es la fuente de verdad de los puertos reales, no la memoria
  de nadie ni la documentación oficial de Supabase.
- Nota de portabilidad: si un colaborador en Mac/Linux clona el repo, este rango
  desplazado sigue funcionando sin problema (no hay conflicto), así que no fue necesario
  condicionar el `config.toml` por plataforma.
