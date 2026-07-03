-- Fase 3 (Motor de IA) — hallazgo de seguridad real durante el diseño del motor
-- de IA, no relacionado directamente con IA pero que hay que cerrar ANTES de
-- que ai_analysis empiece a contener snapshots con reflexiones psicológicas
-- reales de usuarios.
--
-- "trades_select_superadmin" y "ai_analysis_superadmin_select" son policies RLS
-- de SELECT directo: le dan a cualquier superadmin lectura silenciosa de
-- trades/análisis de CUALQUIER usuario, sin quedar registrado en ningún lado.
-- Esto contradice el principio no-negociable del propio PRD (§3.6): "el acceso
-- del SuperAdmin a trades ajenos no puede ser una policy RLS de lectura
-- directa — eso permite acceso sin registro. El único camino válido es una
-- Edge Function con service_role que registra el acceso en audit_log ANTES de
-- devolver los datos."
--
-- Ese Edge Function auditado es scope de Fase 4 (v1.1, ver
-- docs/lineatrader-plan-implementacion.md). Hasta que exista, se falla cerrado:
-- SuperAdmin tiene CERO acceso de lectura directo a trades o ai_analysis
-- ajenos. Hoy no existe ningún panel admin que dependa de estas policies, así
-- que esto no quita funcionalidad real.
drop policy if exists "trades_select_superadmin" on public.trades;
drop policy if exists "ai_analysis_superadmin_select" on public.ai_analysis;

-- TODO(fase4/v1.1): reintroducir acceso de soporte a trades/ai_analysis ajenos
-- EXCLUSIVAMENTE vía una Edge Function con service_role que inserte en
-- audit_log antes de devolver los datos. No restaurar estas policies tal como
-- estaban — esa es precisamente la forma que el PRD marca como inválida.
