# Lineatrader — Schema Completo de Supabase

Convenciones: tablas en plural, snake_case, `uuid` como PK vía `gen_random_uuid()`, soft delete con `deleted_at`, auditoría con `created_at/updated_at`, RLS activado en TODAS las tablas sin excepción.

---

## 0. Extensiones necesarias

```sql
create extension if not exists "pgcrypto";
create extension if not exists "pgsodium";   -- cifrado de columnas (API keys BYOK)
create extension if not exists "vector";     -- pgvector, retrieval semántico futuro (Fase 2 IA)
```

---

## 1. Perfiles y Roles

```sql
create type user_role as enum ('trader', 'superadmin');

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  role            user_role not null default 'trader',
  display_name    text,
  avatar_url      text,
  timezone        text not null default 'UTC',
  onboarding_done boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

-- Trigger: crear profile automáticamente al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_select_superadmin" on public.profiles
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
```

### 1.1 Extensión — respuestas del onboarding

Agregada en `20260701221500_profiles_onboarding_fields.sql`, posterior al diseño inicial
de este schema (el wizard de onboarding se construyó después y necesitó dónde persistir
sus respuestas):

```sql
alter table public.profiles
  add column trading_experience text,   -- 'lt_1y' | '1_3y' | '3_5y' | 'gt_5y'
  add column account_type      text,    -- 'personal' | 'prop_firm' | 'not_started'
  add column primary_broker    text,    -- id de la lista curada, o 'custom:<nombre>'
  add column traded_instruments text[], -- ej. {'forex','crypto'}
  add column onboarding_goals   text[], -- ej. {'journal','analyze'}
  add column acquisition_source text;   -- 'google' | 'ai_tools' | ... | 'other'
```

---

## 2. Instrumentos (catálogo precargado + custom por usuario)

```sql
create type instrument_market as enum ('forex', 'crypto', 'stock', 'index', 'futures');
-- Extendido en 20260701222000_instrument_market_options_cfd.sql:
--   alter type instrument_market add value 'options';
--   alter type instrument_market add value 'cfd';
-- El formulario de Nuevo Trade ofrece ambos como mercado real que un trader retail opera.

create table public.instruments (
  id             uuid primary key default gen_random_uuid(),
  symbol         text not null,
  name           text,
  market         instrument_market not null,
  pip_value      numeric,
  tick_size      numeric,
  contract_size  numeric,
  currency       text,
  is_custom      boolean not null default false,
  created_by     uuid references public.profiles(id), -- null = catálogo global
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (symbol, market, created_by)
);

create index idx_instruments_market on public.instruments(market) where deleted_at is null;

alter table public.instruments enable row level security;

-- Todos ven el catálogo global + sus propios custom
create policy "instruments_select" on public.instruments
  for select using (created_by is null or created_by = auth.uid());

-- Solo pueden crear custom propios
create policy "instruments_insert_own" on public.instruments
  for insert with check (created_by = auth.uid() and is_custom = true);

-- Solo superadmin gestiona el catálogo global
create policy "instruments_manage_global" on public.instruments
  for all using (
    created_by is null and exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin'
    )
  );
```

---

## 3. Estrategias y Reglas del Trader

```sql
create table public.strategies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  description text,
  criteria    jsonb, -- checklist estructurado opcional
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index idx_strategies_user on public.strategies(user_id) where deleted_at is null;

alter table public.strategies enable row level security;
create policy "strategies_owner_all" on public.strategies
  for all using (user_id = auth.uid());

create table public.trader_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index idx_trader_rules_user on public.trader_rules(user_id) where deleted_at is null;

alter table public.trader_rules enable row level security;
create policy "trader_rules_owner_all" on public.trader_rules
  for all using (user_id = auth.uid());
```

---

## 4. Trades (núcleo del sistema)

```sql
create type trade_side as enum ('long', 'short');
create type trade_status as enum ('open', 'closed');

create table public.trades (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  instrument_id    uuid not null references public.instruments(id),
  strategy_id      uuid references public.strategies(id),
  side             trade_side not null,
  status           trade_status not null default 'open',

  -- Información general
  traded_at        timestamptz not null,
  timeframe        text,

  -- Datos técnicos
  entry_price      numeric not null,
  exit_price       numeric,
  stop_loss        numeric,
  take_profit      numeric,
  risk_percent     numeric,
  position_size    numeric,
  pnl_amount       numeric,
  pnl_r            numeric,
  commission       numeric default 0,
  duration_minutes integer,

  -- Contexto
  context_before   text,
  entry_reason     text,
  confirmations    text,
  context_during   text,
  management_notes text,
  context_after    text,
  reflection       text,

  -- Psicología (autoreportado)
  emotion          text,
  confidence_level smallint check (confidence_level between 1 and 10),
  stress_level     smallint check (stress_level between 1 and 10),
  followed_plan    boolean,
  had_fomo         boolean,
  overtraded       boolean,
  moved_stop_loss  boolean, -- autoreporte; el dato OBJETIVO vive en trade_history
  revenge_trade    boolean,

  -- Aprendizaje
  main_mistake     text,
  what_to_repeat   text,
  what_to_avoid    text,
  lesson_learned   text,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,

  constraint chk_closed_has_exit check (
    status = 'open' or (status = 'closed' and exit_price is not null)
  )
);

create index idx_trades_user_date on public.trades(user_id, traded_at desc) where deleted_at is null;
create index idx_trades_user_instrument on public.trades(user_id, instrument_id) where deleted_at is null;
create index idx_trades_user_strategy on public.trades(user_id, strategy_id) where deleted_at is null;
create index idx_trades_status on public.trades(user_id, status) where deleted_at is null;

alter table public.trades enable row level security;

create policy "trades_owner_all" on public.trades
  for all using (user_id = auth.uid());

-- Soporte: superadmin lee (nunca escribe) trades ajenos, siempre queda auditado (ver sección 10)
create policy "trades_select_superadmin" on public.trades
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
```

---

## 5. Trade History — Auditoría automática de campos críticos

Resuelve la tensión entre "edición libre" y "evidencia objetiva": el usuario edita sin fricción, el sistema registra qué cambió realmente sin pedirle nada extra.

```sql
create table public.trade_history (
  id          uuid primary key default gen_random_uuid(),
  trade_id    uuid not null references public.trades(id) on delete cascade,
  changed_at  timestamptz not null default now(),
  changed_by  uuid references public.profiles(id),
  field_name  text not null,
  old_value   text,
  new_value   text
);

create index idx_trade_history_trade on public.trade_history(trade_id, changed_at desc);

alter table public.trade_history enable row level security;

-- Solo lectura para el dueño del trade; nunca insert/update/delete manual (solo vía trigger)
create policy "trade_history_select_owner" on public.trade_history
  for select using (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
  );

-- Función de trigger: compara campos críticos y registra cambios
create function public.trg_audit_trade_changes()
returns trigger
language plpgsql
security definer
as $$
begin
  if old.entry_price is distinct from new.entry_price then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'entry_price', old.entry_price::text, new.entry_price::text);
  end if;
  if old.exit_price is distinct from new.exit_price then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'exit_price', old.exit_price::text, new.exit_price::text);
  end if;
  if old.stop_loss is distinct from new.stop_loss then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'stop_loss', old.stop_loss::text, new.stop_loss::text);
  end if;
  if old.take_profit is distinct from new.take_profit then
    insert into public.trade_history (trade_id, changed_by, field_name, old_value, new_value)
    values (new.id, auth.uid(), 'take_profit', old.take_profit::text, new.take_profit::text);
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger trades_audit_before_update
  before update on public.trades
  for each row execute function public.trg_audit_trade_changes();
```

> Con esto, `moved_stop_loss` (autoreporte) puede compararse contra `select count(*) from trade_history where trade_id = X and field_name = 'stop_loss'` (dato objetivo). La discrepancia entre ambos es, en sí misma, una señal psicológica útil para la IA.

---

## 6. Imágenes del Trade (Storage)

```sql
create type trade_image_stage as enum ('before', 'during', 'after');

create table public.trade_images (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades(id) on delete cascade,
  stage        trade_image_stage not null,
  storage_path text not null, -- path dentro del bucket, no la URL completa
  created_at   timestamptz not null default now()
);

create index idx_trade_images_trade on public.trade_images(trade_id);

alter table public.trade_images enable row level security;
create policy "trade_images_owner_all" on public.trade_images
  for all using (
    exists (select 1 from public.trades t where t.id = trade_id and t.user_id = auth.uid())
  );
```

**Storage bucket `trade-images`** (privado, no público):
```sql
-- Política de Storage: cada usuario solo accede a objetos bajo su propio user_id/
create policy "trade_images_storage_owner"
  on storage.objects for all
  using (bucket_id = 'trade-images' and (storage.foldername(name))[1] = auth.uid()::text);
```
Convención de path: `{user_id}/{trade_id}/{stage}_{filename}`.

**Conectado y verificado** (`src/lib/tradeImages.ts`, usado desde `TradeDetail.tsx`):
subida real con validación cliente (máx. 5MB, solo `image/*`) antes de tocar la red,
lectura vía URL firmada (`createSignedUrl`, 1 hora — el bucket es privado, no hay URL
pública) regenerada en cada carga de página, nunca persistida. Verificado con una subida
real: la fila en `trade_images`, el objeto físico en `storage.objects`, y el rechazo de
una request anónima directa al objeto (con la `anon key` pero sin sesión) — los tres
confirmados, no asumidos.

---

## 7. Hilos de Seguimiento (Threads)

```sql
create table public.trade_threads (
  id           uuid primary key default gen_random_uuid(),
  trade_id     uuid not null references public.trades(id) on delete cascade,
  user_id      uuid not null references public.profiles(id),
  parent_id    uuid references public.trade_threads(id), -- respuestas anidadas
  content      text not null,
  ai_generated boolean not null default false,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index idx_trade_threads_trade on public.trade_threads(trade_id, created_at) where deleted_at is null;

alter table public.trade_threads enable row level security;
create policy "trade_threads_owner_all" on public.trade_threads
  for all using (user_id = auth.uid());
```

---

## 8. Objetivos

```sql
create table public.objectives (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  metric_type   text not null, -- 'win_rate' | 'profit_factor' | 'r_avg' | 'custom'
  target_value  numeric not null,
  current_value numeric default 0,
  period_start  date,
  period_end    date,
  achieved      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index idx_objectives_user on public.objectives(user_id) where deleted_at is null;

alter table public.objectives enable row level security;
create policy "objectives_owner_all" on public.objectives
  for all using (user_id = auth.uid());
```

---

## 9. IA — Configuración, Uso y Análisis

### 9.1 Configuración global de proveedores (solo SuperAdmin)

```sql
create table public.ai_provider_config (
  id                 uuid primary key default gen_random_uuid(),
  provider_name      text not null, -- 'openai' | 'anthropic' | 'gemini' | 'groq' | 'deepseek' | 'openrouter' | 'ollama'
  api_key_encrypted  bytea,          -- cifrado con pgsodium; null para providers locales (ollama)
  model_name         text not null,
  is_default         boolean not null default false,
  is_active          boolean not null default true,
  max_tokens         integer not null default 4000,
  cost_per_1k_tokens numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.ai_provider_config enable row level security;

-- Nunca visible al cliente directamente: solo Edge Functions con service_role la leen.
create policy "ai_provider_config_superadmin_only" on public.ai_provider_config
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
```

### 9.2 Configuración BYOK por usuario

```sql
create table public.user_ai_settings (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  byok_provider            text,
  byok_api_key_encrypted   bytea,
  use_own_key              boolean not null default false,
  updated_at               timestamptz not null default now()
);

alter table public.user_ai_settings enable row level security;
create policy "user_ai_settings_owner_all" on public.user_ai_settings
  for all using (user_id = auth.uid());
```

### 9.3 Control de uso diario (rate limiting sin Redis)

```sql
create table public.ai_usage_daily (
  user_id        uuid not null references public.profiles(id) on delete cascade,
  usage_date     date not null default current_date,
  requests_count integer not null default 0,
  tokens_used    integer not null default 0,
  source         text not null check (source in ('free_tier', 'byok')),
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;
create policy "ai_usage_daily_select_own" on public.ai_usage_daily
  for select using (user_id = auth.uid());

-- Incremento atómico, llamado solo desde Edge Function con service_role
create function public.increment_ai_usage(p_user_id uuid, p_tokens integer, p_source text)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.ai_usage_daily (user_id, usage_date, requests_count, tokens_used, source)
  values (p_user_id, current_date, 1, p_tokens, p_source)
  on conflict (user_id, usage_date)
  do update set
    requests_count = ai_usage_daily.requests_count + 1,
    tokens_used = ai_usage_daily.tokens_used + p_tokens;
end;
$$;
```

### 9.4 Prompts versionados (editables por SuperAdmin sin tocar código)

```sql
create table public.ai_prompts (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,          -- ej. 'trade_analysis', 'behavioral_summary'
  version    integer not null,
  content    text not null,
  is_active  boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (name, version)
);

create index idx_ai_prompts_active on public.ai_prompts(name) where is_active = true;

alter table public.ai_prompts enable row level security;
create policy "ai_prompts_superadmin_manage" on public.ai_prompts
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
create policy "ai_prompts_select_all_authenticated" on public.ai_prompts
  for select using (auth.uid() is not null);
```

### 9.5 Análisis de IA — con snapshot inmutable

Evita que un análisis quede inconsistente si el trade se edita después.

```sql
create table public.ai_analysis (
  id                        uuid primary key default gen_random_uuid(),
  trade_id                  uuid not null references public.trades(id) on delete cascade,
  user_id                   uuid not null references public.profiles(id),
  prompt_id                 uuid references public.ai_prompts(id),
  provider_name             text not null,
  model_name                text not null,
  trade_snapshot_at_analysis jsonb not null, -- copia inmutable del trade al momento del análisis
  response_text             text not null,
  tokens_used               integer,
  cost_estimate             numeric,
  created_at                timestamptz not null default now()
);

create index idx_ai_analysis_trade on public.ai_analysis(trade_id, created_at desc);
create index idx_ai_analysis_user on public.ai_analysis(user_id, created_at desc);

alter table public.ai_analysis enable row level security;
create policy "ai_analysis_owner_select" on public.ai_analysis
  for select using (user_id = auth.uid());
create policy "ai_analysis_superadmin_select" on public.ai_analysis
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
-- Insert únicamente vía Edge Function con service_role, nunca directo desde el cliente.
```

---

## 10. Auditoría global (para Panel SuperAdmin)

```sql
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id),
  action      text not null,       -- 'trade.update' | 'admin.view_trade' | 'ai_provider.update' ...
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_audit_log_user on public.audit_log(user_id, created_at desc);

alter table public.audit_log enable row level security;
create policy "audit_log_superadmin_only" on public.audit_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );
-- Insert solo vía funciones security definer, nunca desde el cliente.
```

> **Importante:** cada vez que un SuperAdmin lee un trade ajeno (política `trades_select_superadmin`), debería quedar registrado aquí vía trigger `AFTER SELECT` no es soportado nativamente en Postgres — la alternativa real es loguear el acceso desde la Edge Function/RPC que sirve el panel admin, no como trigger de tabla. Anótalo como pendiente de implementación en el backend, no en el schema.

---

## 10.1 Bug real encontrado: recursión infinita en RLS de `profiles`

Al conectar el login real (`20260701223000_fix_profiles_rls_recursion.sql`) se descubrió
que `profiles_select_superadmin` (sección 1) rompía **cualquier** `select` a `profiles`,
incluido el del propio dueño: `infinite recursion detected in policy for relation
"profiles"`.

Causa: esa policy vive **sobre** `profiles` y su `using` hace `exists (select 1 from
public.profiles ...)` — una subconsulta a la misma tabla que está protegiendo. Postgres
necesita reevaluar las políticas de `profiles` para resolver esa subconsulta, lo que
vuelve a disparar la misma policy, indefinidamente. Es un anti-patrón conocido de RLS:
una policy nunca debe consultar su propia tabla dentro de su `using`.

Fix aplicado (y replicado en las otras 6 policies que repetían el mismo `exists (select
1 from profiles...)`, aunque no fueran recursivas por vivir en otras tablas — por
consistencia, y para que nadie las use como plantilla y reintroduzca el bug):

```sql
create function public.is_superadmin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'superadmin'
  );
$$;
```

`security definer` corre la función con los permisos de su dueño, así que su consulta
interna a `profiles` **no vuelve a pasar por RLS** — rompe el ciclo. Regla general: todo
check de rol/permiso usado dentro de una policy debe ir en una función así, nunca como
subconsulta inline repetida.

## 10.2 Bug real encontrado: faltaban los GRANT a `authenticated`

Justo después del fix anterior, el login seguía fallando — nuevo error: `permission
denied for table profiles`. RLS solo filtra **filas**; Postgres exige además el permiso
de tabla (`GRANT select/insert/update/delete`) antes de evaluar cualquier policy.
Supabase cambió su comportamiento por defecto: ya no auto-expone tablas nuevas a
`anon`/`authenticated` (ver `auto_expose_new_tables` en `supabase/config.toml`) — el
schema original (secciones 1-10) asumía el comportamiento legado y nunca declaró estos
GRANT explícitamente.

Fix en `20260701223500_grant_authenticated_privileges.sql`: `grant select, insert,
update, delete` sobre las 15 tablas a `authenticated` (nada a `anon` — el producto no
tiene superficie pública). Esto es seguro porque las policies de RLS siguen siendo la
restricción real por fila/operación: donde una tabla no tiene policy para `insert` (ej.
`trade_history`, `ai_analysis`, `audit_log` — todas de solo lectura o vía función/Edge
Function), el GRANT de tabla no habilita esa operación igual. **Toda tabla nueva que se
agregue de aquí en adelante necesita este GRANT explícito además de sus policies —
RLS sin GRANT no sirve de nada.**

## 10.3 Vista de estadísticas para el Dashboard (Fase 1)

`20260702120000_user_trade_stats_view.sql` agrega `public.v_user_trade_stats`, la fuente
de los cards de métricas del Dashboard — mismo espíritu que `v_user_stats_30d` de
`trade-journal-os-context-engine.md` §2, pero agregando **todo el historial** en vez de
una ventana de 30 días (una cuenta nueva no tendría nada que mostrar en 30 días).

```sql
create view public.v_user_trade_stats
with (security_invoker = true)
as
select
  user_id,
  count(*) as total_trades,
  count(*) filter (where status = 'closed') as closed_trades,
  round(count(*) filter (where status = 'closed' and pnl_amount > 0)::numeric
    / nullif(count(*) filter (where status = 'closed'), 0) * 100, 2) as win_rate,
  round(sum(pnl_amount) filter (where pnl_amount > 0)
    / nullif(abs(sum(pnl_amount) filter (where pnl_amount < 0)), 0), 2) as profit_factor,
  round(avg(pnl_r) filter (where status = 'closed'), 2) as avg_r
from public.trades
where deleted_at is null
group by user_id;

grant select on public.v_user_trade_stats to authenticated;
```

`security_invoker = true` es obligatorio: sin esa opción, la vista corre con los
permisos de su dueño (`postgres`) y filtraría las estadísticas de **todos** los usuarios
a cualquiera que la consulte, saltándose por completo `trades_owner_all`. Con
`security_invoker`, Postgres evalúa la RLS de `trades` como el usuario que hace la
consulta, así que la vista nunca agrega más de una fila (la propia) por usuario normal.

Nota honesta (histórica — ya resuelta, ver §10.4): mientras `NuevoTrade.tsx` no tuviera
forma de cerrar un trade, todos quedaban en `status = 'open'` y esta vista siempre
devolvía `null`. El Dashboard mostraba ese estado honestamente ("—", nunca un número
inventado) en vez de fingir un dato que no existía.

## 10.4 Cierre de trade — cálculo de PnL/R en el backend

`20260702130000_close_trade_pnl_trigger.sql`. Mismo principio que la vista de
estadísticas: el cliente nunca calcula ni envía `pnl_amount`/`pnl_r` — solo manda
`exit_price` y `status = 'closed'` desde `TradeDetail.tsx`, y un trigger hace la
aritmética en el servidor.

```sql
create function public.trg_calculate_trade_pnl()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'closed' and new.exit_price is not null then
    if new.side = 'long' then
      new.pnl_amount = (new.exit_price - new.entry_price) * coalesce(new.position_size, 0) - coalesce(new.commission, 0);
    else
      new.pnl_amount = (new.entry_price - new.exit_price) * coalesce(new.position_size, 0) - coalesce(new.commission, 0);
    end if;

    if new.stop_loss is not null and new.stop_loss <> new.entry_price and coalesce(new.position_size, 0) > 0 then
      new.pnl_r = round(new.pnl_amount / (abs(new.entry_price - new.stop_loss) * new.position_size), 4);
    else
      new.pnl_r = null;
    end if;
  end if;
  return new;
end;
$$;

create trigger trades_calculate_pnl
  before insert or update on public.trades
  for each row execute function public.trg_calculate_trade_pnl();
```

Sin `stop_loss` no hay unidad de riesgo con la cual normalizar — `pnl_r` se deja `null`
en vez de inventar un denominador. Por eso `NuevoTrade.tsx` ahora captura `stop_loss`
como campo opcional en el paso técnico (no existía antes de este cambio).

Convive con `trades_audit_before_update` (§5) en el mismo evento `before update` — el
orden de ejecución de Postgres es alfabético por nombre de trigger
(`trades_audit_before_update` antes que `trades_calculate_pnl`), y ambos son
compatibles: uno solo escribe `trade_history`/`updated_at`, el otro solo
`pnl_amount`/`pnl_r`.

Verificado a mano: entrada 3000, stop_loss 2900, tamaño 2, comisión 5, salida 3300 →
el trigger produjo `pnl_amount = 595`, `pnl_r = 2.975` — coincide exactamente con el
cálculo manual. Un segundo trade cerrado en pérdida sin `stop_loss` produjo
`pnl_amount` no nulo y `pnl_r` nulo, como se espera.

---

## 11. Estrategia de Migraciones

- Una migración por cambio atómico, vía Supabase CLI: `supabase migration new nombre_descriptivo`.
- Nomenclatura: `YYYYMMDDHHMMSS_descripcion_en_snake_case.sql`.
- Nunca editar una migración ya aplicada en producción — siempre migración nueva, incluso para revertir.
- `supabase db diff` para generar migraciones desde cambios hechos en el Studio local, revisadas a mano antes de commitear.
- Seeds separados (`supabase/seed.sql`) para precargar el catálogo global de `instruments`.

---

## 12. Resumen de índices críticos (rendimiento a 500–10k usuarios)

| Tabla | Índice | Motivo |
|---|---|---|
| `trades` | `(user_id, traded_at desc)` | Listado principal / dashboard |
| `trades` | `(user_id, instrument_id)` | Estadísticas por instrumento |
| `trade_history` | `(trade_id, changed_at desc)` | Timeline de auditoría por trade |
| `ai_analysis` | `(user_id, created_at desc)` | Historial de análisis IA |
| `ai_usage_daily` | PK compuesta `(user_id, usage_date)` | Lookup O(1) en rate limiting |

Todos los índices sobre tablas con soft delete usan `where deleted_at is null` (índice parcial) para no cargar filas eliminadas en cada consulta.
