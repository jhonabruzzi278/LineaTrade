-- Security hotfix: authenticated users previously had table-wide UPDATE on
-- profiles and the owner policy allowed every column, including `role`.
-- Since is_superadmin() trusts profiles.role, a trader could promote their own
-- row and inherit all superadmin RPC permissions.

revoke update on table public.profiles from authenticated;

-- Keep only the profile fields that the product intentionally lets a user edit.
-- Identity, role, lifecycle and audit columns remain server-managed.
grant update (
  display_name,
  avatar_url,
  timezone,
  onboarding_done,
  trading_experience,
  account_type,
  primary_broker,
  traded_instruments,
  onboarding_goals,
  acquisition_source
) on table public.profiles to authenticated;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Defense in depth: even if a future migration accidentally restores a broad
-- table UPDATE grant, unprivileged database roles still cannot change `role`.
create or replace function public.prevent_unauthorized_profile_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'profile role can only be changed by a privileged server operation'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_unauthorized_profile_role_change() from public;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
  before update of role on public.profiles
  for each row execute function public.prevent_unauthorized_profile_role_change();

-- Fail the deployment instead of reporting success if any protection above is
-- missing. This also makes the file safe to run directly from the SQL Editor.
do $$
begin
  if has_column_privilege('authenticated', 'public.profiles', 'role', 'UPDATE') then
    raise exception 'security verification failed: authenticated can still update profiles.role';
  end if;

  if not has_column_privilege('authenticated', 'public.profiles', 'avatar_url', 'UPDATE') then
    raise exception 'security verification failed: editable profile columns were not granted';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.profiles'::regclass
      and tgname = 'protect_profile_role'
      and not tgisinternal
  ) then
    raise exception 'security verification failed: protect_profile_role trigger is missing';
  end if;
end;
$$;
