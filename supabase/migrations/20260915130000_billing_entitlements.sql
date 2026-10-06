-- Billing foundation and server-resolved entitlements.
-- No checkout is enabled by this migration; payment state is writable only by
-- privileged backend processes after a verified provider webhook.

create table public.billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  provider_subscription_id text not null unique,
  provider_product_id text,
  provider_price_id text,
  plan_key text not null check (plan_key in ('free', 'pro', 'byok')),
  status text not null check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_status_idx
  on public.subscriptions (user_id, status, updated_at desc);

create table public.plan_entitlements (
  plan_key text not null check (plan_key in ('free', 'pro', 'byok')),
  feature_key text not null check (char_length(feature_key) between 1 and 100),
  enabled boolean not null default true,
  hard_limit integer check (hard_limit is null or hard_limit >= 0),
  period text check (period is null or period in ('day', 'month', 'lifetime')),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (plan_key, feature_key)
);

create table public.user_entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (char_length(feature_key) between 1 and 100),
  enabled boolean,
  hard_limit integer check (hard_limit is null or hard_limit >= 0),
  period text check (period is null or period in ('day', 'month', 'lifetime')),
  expires_at timestamptz,
  reason text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_entitlement_overrides_active_idx
  on public.user_entitlement_overrides (user_id, feature_key)
  where expires_at is null;

create table public.billing_webhook_events (
  provider text not null default 'stripe' check (provider in ('stripe')),
  event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  primary key (provider, event_id)
);

alter table public.billing_customers enable row level security;
alter table public.subscriptions enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.user_entitlement_overrides enable row level security;
alter table public.billing_webhook_events enable row level security;

create policy "Users can read their billing customer"
  on public.billing_customers for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can read their subscriptions"
  on public.subscriptions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Authenticated users can read plan entitlements"
  on public.plan_entitlements for select to authenticated
  using (true);

create policy "Users can read their entitlement overrides"
  on public.user_entitlement_overrides for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.billing_customers from anon, authenticated;
revoke all on public.subscriptions from anon, authenticated;
revoke all on public.plan_entitlements from anon, authenticated;
revoke all on public.user_entitlement_overrides from anon, authenticated;
revoke all on public.billing_webhook_events from anon, authenticated;

grant select on public.billing_customers to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.plan_entitlements to authenticated;
grant select on public.user_entitlement_overrides to authenticated;

insert into public.plan_entitlements (plan_key, feature_key, enabled, hard_limit, period) values
  ('free', 'journal', true, null, null),
  ('free', 'dashboard', true, null, null),
  ('free', 'academy', true, null, null),
  ('free', 'ai_actions', true, 3, 'day'),
  ('free', 'scanner_queries', true, 5, 'day'),
  ('free', 'news_briefs', false, 0, 'month'),
  ('free', 'advanced_insights', false, 0, 'month'),
  ('free', 'advanced_alerts', false, 0, 'month'),
  ('pro', 'journal', true, null, null),
  ('pro', 'dashboard', true, null, null),
  ('pro', 'academy', true, null, null),
  ('pro', 'ai_actions', true, 300, 'month'),
  ('pro', 'scanner_queries', true, 500, 'month'),
  ('pro', 'news_briefs', true, null, null),
  ('pro', 'advanced_insights', true, null, null),
  ('pro', 'advanced_alerts', true, null, null),
  ('byok', 'journal', true, null, null),
  ('byok', 'dashboard', true, null, null),
  ('byok', 'academy', true, null, null),
  ('byok', 'ai_actions', true, null, null),
  ('byok', 'scanner_queries', true, 500, 'month'),
  ('byok', 'news_briefs', true, null, null),
  ('byok', 'advanced_insights', true, null, null),
  ('byok', 'advanced_alerts', true, null, null);

create or replace function public.get_my_entitlements()
returns table (
  plan_key text,
  feature_key text,
  enabled boolean,
  hard_limit integer,
  period text
)
language sql
stable
security definer
set search_path = ''
as $$
  with selected_plan as (
    select coalesce((
      select s.plan_key
      from public.subscriptions s
      where s.user_id = auth.uid()
        and (
          s.status in ('trialing', 'active')
          or (s.status = 'past_due' and s.current_period_end > now())
        )
      order by s.updated_at desc
      limit 1
    ), 'free') as plan_key
  ), base as (
    select e.plan_key, e.feature_key, e.enabled, e.hard_limit, e.period
    from public.plan_entitlements e
    join selected_plan p on p.plan_key = e.plan_key
  ), active_overrides as (
    select distinct on (o.feature_key)
      o.feature_key, o.enabled, o.hard_limit, o.period
    from public.user_entitlement_overrides o
    where o.user_id = auth.uid()
      and (o.expires_at is null or o.expires_at > now())
    order by o.feature_key, o.updated_at desc
  )
  select
    b.plan_key,
    b.feature_key,
    coalesce(o.enabled, b.enabled),
    coalesce(o.hard_limit, b.hard_limit),
    coalesce(o.period, b.period)
  from base b
  left join active_overrides o using (feature_key);
$$;

revoke all on function public.get_my_entitlements() from public;
grant execute on function public.get_my_entitlements() to authenticated;

comment on function public.get_my_entitlements() is
  'Returns effective entitlements for auth.uid(); payment state remains server-owned.';
