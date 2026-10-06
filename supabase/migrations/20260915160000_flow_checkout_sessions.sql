create table public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  flow_customer_id text not null,
  flow_plan_id text not null,
  registration_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'registered', 'subscribed', 'failed')),
  error_code text,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index billing_checkout_sessions_user_idx
  on public.billing_checkout_sessions (user_id, created_at desc);

alter table public.billing_checkout_sessions enable row level security;
create policy "Users can read their Flow checkout sessions"
  on public.billing_checkout_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.billing_checkout_sessions from anon, authenticated;
grant select on public.billing_checkout_sessions to authenticated;

