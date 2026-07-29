-- Catálogo de objetos de dibujo semántico (Módulo 2 + Módulo 8 del spec de backtesting,
-- ver docs/lineatrade-backtesting-plan.md §1.2). Presets del sistema (is_system = true,
-- user_id null) + confluencias propias que cada usuario puede definir con su propio
-- nombre/color/forma (Módulo 8: "estrategias personalizadas" real, a diferencia de
-- `strategies`, que es solo texto sin semántica visual).
create table public.confluence_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  color text not null,
  shape text not null check (shape in ('square', 'rectangle', 'circle', 'arrow', 'line', 'label')),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Un usuario no puede repetir el nombre de una confluencia propia, ni pisar el nombre
-- de un preset del sistema. coalesce colapsa "null" (sistema) a un uuid fijo para que
-- el índice único trate todos los presets del sistema como un mismo "dueño" a efectos
-- de unicidad de nombre.
create unique index confluence_types_owner_name_uniq on public.confluence_types (
  coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), name
);

alter table public.confluence_types enable row level security;

-- Cuatro políticas separadas (no un solo "for all") porque select tiene una regla más
-- amplia (presets del sistema + propias) que insert/update/delete (solo propias, y
-- nunca sobre is_system = true — evita que un usuario edite o borre un preset global).
create policy confluence_types_select on public.confluence_types
  for select using (is_system = true or user_id = auth.uid());

create policy confluence_types_insert on public.confluence_types
  for insert with check (user_id = auth.uid() and is_system = false);

create policy confluence_types_update on public.confluence_types
  for update using (user_id = auth.uid() and is_system = false)
  with check (user_id = auth.uid() and is_system = false);

create policy confluence_types_delete on public.confluence_types
  for delete using (user_id = auth.uid() and is_system = false);

grant select, insert, update, delete on public.confluence_types to authenticated;

comment on table public.confluence_types is
  'Catálogo de confluencias de trading (FVG, Order Block, BOS, etc.) con color y forma '
  'para dibujarlas sobre el gráfico. is_system = true son los 9 presets del spec '
  'original, visibles para todos los usuarios y no editables por nadie.';

-- Presets del sistema — colores elegidos para no chocar con los tokens semánticos
-- gain/loss/signal de src/index.css (ver docs/lineatrade-design-system.md).
insert into public.confluence_types (user_id, name, color, shape, is_system) values
  (null, 'Fair Value Gap (FVG)', '#3B82F6', 'square', true),
  (null, 'Liquidez', '#EF4444', 'square', true),
  (null, 'Order Block', '#22C55E', 'square', true),
  (null, 'CHoCH', '#EAB308', 'arrow', true),
  (null, 'BOS', '#A855F7', 'line', true),
  (null, 'Zona de Oferta', '#F97316', 'rectangle', true),
  (null, 'Zona de Demanda', '#38BDF8', 'rectangle', true),
  (null, 'Mitigación', '#94A3B8', 'circle', true),
  (null, 'Confirmación', '#FACC15', 'label', true);
