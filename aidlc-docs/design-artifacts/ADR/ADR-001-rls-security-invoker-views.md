# ADR-001: Toda vista sobre una tabla con RLS debe declarar `security_invoker = true`

**Estado:** Aceptado (ya implementado en las 4 vistas existentes)
**Fecha de la decisión:** documentada en CLAUDE.md, migración
`20260702120000_user_trade_stats_view.sql`

## Contexto

Un `create view` de Postgres normal corre con los privilegios de su **creador**, no del
usuario que la consulta. Al crear `v_user_trade_stats` (`select user_id, ... from trades
group by user_id`), la primera versión ingenua habría permitido que cualquier usuario
autenticado leyera las estadísticas agregadas de **todos** los usuarios, sin importar que
`trades` tenga una policy RLS `trades_owner_all` — la vista bypassea esa policy por
completo porque no la re-evalúa como el caller.

Este bug fue detectado **en revisión**, no por una query fallida — es la versión
peligrosa de un bug de seguridad: no falla ruidosamente, filtra datos silenciosamente.

## Decisión

Toda vista creada sobre una tabla protegida por RLS debe declararse con
`with (security_invoker = true)` (disponible desde Postgres 15+). Esto fuerza a la vista
a evaluar las policies RLS de las tablas subyacentes **como el usuario que llama**, no
como el propietario de la vista.

## Consecuencias

- Positivo: cierra una clase completa de bug de fuga de datos cross-usuario sin
  necesidad de duplicar lógica de RLS dentro de cada vista.
- Negativo / riesgo residual: Postgres **no advierte** si se omite — es responsabilidad
  humana (o de una skill/lint de revisión) recordarlo en cada nueva vista. No hay
  enforcement automatizado en este repo (no hay un test pgTAP ni un check de CI que lo
  verifique) — **gap real**, ver `testing/TEST_STRATEGY.md`.

## Alcance de la regla

Aplica a las 4 vistas actuales (`v_user_trade_stats`, `v_user_stats_by_strategy`,
`v_user_stats_by_emotion`, `v_rule_violations`) y a cualquier vista futura sobre
`trades`, `profiles`, `objectives`, `trader_rules`, `strategies`, o cualquier otra tabla
con RLS activo (es decir: todas las tablas del schema, sin excepción).
