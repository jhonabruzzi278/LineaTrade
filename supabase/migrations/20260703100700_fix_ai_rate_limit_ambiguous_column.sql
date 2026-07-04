-- Fase 3 (Motor de IA) — fix real encontrado probando el Edge Function contra
-- el stack local: check_and_increment_ai_usage (20260703100100) fallaba en
-- TODA llamada con "column reference "requests_count" is ambiguous".
--
-- Causa: `returns table (allowed boolean, requests_count integer, tokens_used
-- integer)` declara requests_count/tokens_used como parámetros OUT dentro del
-- cuerpo de la función — mismo nombre que las columnas de
-- ai_usage_daily. El `update ... set requests_count = requests_count + 1`
-- quedaba ambiguo entre el OUT param y la columna, sin importar que el resto
-- de la función sí calificara correctamente vía v_row. No se puede reproducir
-- en el schema doc porque esa función es nueva de esta fase — no había forma
-- de detectarlo sin llamar al Edge Function de verdad, que es justamente lo
-- que se hizo acá. No se edita 20260703100100 (ya aplicada) — nueva migración,
-- create or replace sobre la misma firma.
create or replace function public.check_and_increment_ai_usage(
  p_user_id uuid,
  p_tokens integer,
  p_source text,
  p_daily_limit integer
)
returns table (allowed boolean, requests_count integer, tokens_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_usage_daily%rowtype;
begin
  insert into public.ai_usage_daily (user_id, usage_date, requests_count, tokens_used, source)
  values (p_user_id, current_date, 0, 0, p_source)
  on conflict (user_id, usage_date) do nothing;

  select * into v_row
  from public.ai_usage_daily
  where user_id = p_user_id and usage_date = current_date
  for update;

  if v_row.requests_count >= p_daily_limit then
    return query select false, v_row.requests_count, v_row.tokens_used;
    return;
  end if;

  update public.ai_usage_daily as aud
  set requests_count = aud.requests_count + 1,
      tokens_used = aud.tokens_used + p_tokens,
      source = p_source
  where aud.user_id = p_user_id and aud.usage_date = current_date
  returning aud.* into v_row;

  return query select true, v_row.requests_count, v_row.tokens_used;
end;
$$;

revoke all on function public.check_and_increment_ai_usage(uuid, integer, text, integer) from public;
grant execute on function public.check_and_increment_ai_usage(uuid, integer, text, integer) to service_role;
