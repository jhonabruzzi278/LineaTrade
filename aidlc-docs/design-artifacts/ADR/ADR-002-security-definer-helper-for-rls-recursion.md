# ADR-002: Usar una función `security definer stable` para romper recursión de RLS

**Estado:** Aceptado (ya implementado)
**Fecha de la decisión:** migración `20260701223000_fix_profiles_rls_recursion.sql`

## Contexto

La policy original `profiles_select_superadmin` (copiada literalmente del schema doc)
vivía **sobre** `profiles` y hacía `exists (select 1 from public.profiles where role =
'superadmin' ...)` dentro de su propio `using`. Postgres necesita re-evaluar las
policies de `profiles` para resolver esa subquery, lo cual dispara la misma policy otra
vez — recursión infinita: `infinite recursion detected in policy for relation
"profiles"`. Este patrón estaba repetido en 7 lugares distintos del schema (cualquier
policy que necesitara comprobar "¿es superadmin?").

## Decisión

Extraer la comprobación a `public.is_superadmin(uid)`, una función `security definer
stable`. Al correr con los privilegios del *dueño de la función* en vez de los del
caller, su query interna a `profiles` **no** re-dispara las policies de `profiles` —
bypassea RLS deliberadamente, pero solo dentro de esta función de un solo propósito, no
en general.

## Consecuencias

- Positivo: una sola función reemplaza el patrón repetido `exists (select 1 from
  profiles where role = 'superadmin')` en las 7 policies que lo necesitaban — cualquier
  cambio futuro a la lógica de "qué es un superadmin" se hace en un solo lugar.
- Riesgo a vigilar: cualquier función `security definer` es, por definición, una
  elevación de privilegios deliberada — debe mantenerse `stable` (no `volatile`) y con
  el alcance más estrecho posible (aquí: solo lee `role`, no escribe nada). No usar este
  patrón como solución genérica a "RLS me da un error" sin entender primero si el error
  es legítimo.

## Regla derivada

**Una policy RLS nunca debe consultar su propia tabla inline.** Si una policy necesita
verificar una condición sobre la misma tabla que protege, la condición debe salir a una
función `security definer stable`, no vivir como subquery directa dentro del `using`.
