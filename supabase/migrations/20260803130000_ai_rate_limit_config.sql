-- Panel de admin: límite diario de análisis de IA (tier gratuito) configurable
-- sin tocar código, a pedido explícito del dueño del repo mientras desarrolla
-- (no quiere chocar contra FREE_TIER_DAILY_LIMIT = 3, ver
-- supabase/functions/_shared/rateLimiter.ts). Hasta ahora ese número era una
-- constante de aplicación fija — subirlo requería editar el código y
-- redeployar cada Edge Function que llama a checkAndIncrementUsage
-- (analyze-trade, extract-trade-image, ai-coach-chat, generate-insights,
-- explain-scan-result, resolve-scanner-query, detect-confluences). Fila
-- única (singleton, id fijo en 1 — mismo patrón que evitar una tabla
-- key/value genérica cuando solo hay un valor real que configurar).
create table public.ai_rate_limit_config (
  id                     smallint primary key default 1,
  free_tier_daily_limit  integer not null default 3 check (free_tier_daily_limit > 0),
  updated_at             timestamptz not null default now(),
  constraint ai_rate_limit_config_singleton check (id = 1)
);

insert into public.ai_rate_limit_config (id, free_tier_daily_limit) values (1, 3);

alter table public.ai_rate_limit_config enable row level security;

-- Igual que ai_provider_config: nunca visible al cliente salvo superadmin.
create policy "ai_rate_limit_config_superadmin_select" on public.ai_rate_limit_config
  for select using (public.is_superadmin(auth.uid()));

grant select on public.ai_rate_limit_config to authenticated;
-- rateLimiter.ts lee esta fila con el service client (bypassa RLS, pero
-- igual necesita el GRANT de tabla — mismo bug class documentado en
-- CLAUDE.md "Three real RLS/security bugs", ya recurrente en este repo).
grant select on public.ai_rate_limit_config to service_role;

-- set_ai_rate_limit(): única vía de escritura (misma forma que
-- set_provider_model/set_provider_api_key — security definer + gate de
-- is_superadmin, sin política de UPDATE directa sobre la tabla).
create function public.set_ai_rate_limit(p_daily_limit integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin(auth.uid()) then
    raise exception 'insufficient_privilege';
  end if;

  if p_daily_limit is null or p_daily_limit < 1 then
    raise exception 'invalid_daily_limit';
  end if;

  update public.ai_rate_limit_config
  set free_tier_daily_limit = p_daily_limit,
      updated_at = now()
  where id = 1;
end;
$$;

revoke all on function public.set_ai_rate_limit(integer) from public;
grant execute on function public.set_ai_rate_limit(integer) to authenticated;
