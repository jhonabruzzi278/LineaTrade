-- Instrumentos (catálogo precargado + custom por usuario)
create type instrument_market as enum ('forex', 'crypto', 'stock', 'index', 'futures');

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
