-- IA — Configuración, Uso y Análisis

-- 9.1 Configuración global de proveedores (solo SuperAdmin)
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

-- 9.2 Configuración BYOK por usuario
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

-- 9.3 Control de uso diario (rate limiting sin Redis)
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

-- 9.4 Prompts versionados (editables por SuperAdmin sin tocar código)
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

-- 9.5 Análisis de IA — con snapshot inmutable
-- Evita que un análisis quede inconsistente si el trade se edita después.
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
