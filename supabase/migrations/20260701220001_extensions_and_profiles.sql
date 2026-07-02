-- Extensiones necesarias
create extension if not exists "pgcrypto";
create extension if not exists "pgsodium";   -- cifrado de columnas (API keys BYOK)
create extension if not exists "vector";     -- pgvector, retrieval semántico futuro (Fase 2 IA)

-- Perfiles y Roles
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
