-- Fase 3 (Motor de IA) — reemplaza increment_ai_usage (incrementaba sin chequear
-- límite: dos requests concurrentes del mismo usuario podían ambas leer "2 de 3"
-- y ambas pasar) por una función atómica que chequea y reserva el cupo en la
-- misma transacción.
drop function if exists public.increment_ai_usage(uuid, integer, text);

create function public.check_and_increment_ai_usage(
  p_user_id uuid,
  p_tokens integer,
  p_source text,       -- 'free_tier' | 'byok'
  p_daily_limit integer -- lo decide el caller (Edge Function), nunca hardcodeado acá
)
returns table (allowed boolean, requests_count integer, tokens_used integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.ai_usage_daily%rowtype;
begin
  -- Garantiza que exista la fila de hoy sin pisar una que ya tenga contador.
  insert into public.ai_usage_daily (user_id, usage_date, requests_count, tokens_used, source)
  values (p_user_id, current_date, 0, 0, p_source)
  on conflict (user_id, usage_date) do nothing;

  -- "for update" es lo que cierra la ventana de carrera: serializa cualquier
  -- otra llamada concurrente para el mismo user_id+usage_date hasta que esta
  -- transacción termine (commit o rollback). Sin esto, dos requests podrían
  -- leer el mismo requests_count antes de que ninguna incremente.
  select * into v_row
  from public.ai_usage_daily
  where user_id = p_user_id and usage_date = current_date
  for update;

  if v_row.requests_count >= p_daily_limit then
    return query select false, v_row.requests_count, v_row.tokens_used;
    return;
  end if;

  update public.ai_usage_daily
  set requests_count = requests_count + 1,
      tokens_used = tokens_used + p_tokens,
      source = p_source
  where user_id = p_user_id and usage_date = current_date
  returning * into v_row;

  return query select true, v_row.requests_count, v_row.tokens_used;
end;
$$;

-- Solo el Edge Function (service_role) puede llamar esta función. Si
-- "authenticated" pudiera ejecutarla directo, un cliente malicioso podría
-- pasar un p_daily_limit fabricado y bypassear el límite real.
revoke all on function public.check_and_increment_ai_usage(uuid, integer, text, integer) from public;
grant execute on function public.check_and_increment_ai_usage(uuid, integer, text, integer) to service_role;
