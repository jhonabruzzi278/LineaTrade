-- Fondeo Tracker
--
-- This feature records real prop-firm challenges.  It deliberately keeps a
-- versioned rule catalogue separate from a user's challenge: a provider can
-- change its rules without rewriting the rules that applied when the challenge
-- was bought.  Every challenge therefore owns an immutable-at-creation rule
-- snapshot in funding_challenge_rules.

create type public.funding_account_type as enum (
  'evaluation_two_phase',
  'evaluation_one_phase',
  'instant_funded'
);

create type public.funding_challenge_status as enum (
  'phase_one',
  'phase_two',
  'funded',
  'burned',
  'expired',
  'cancelled'
);

create type public.funding_phase_kind as enum ('evaluation', 'funded');

create type public.funding_phase_status as enum (
  'active',
  'passed',
  'failed',
  'expired',
  'cancelled'
);

create type public.funding_drawdown_type as enum (
  'static',
  'end_of_day',
  'trailing'
);

create type public.funding_payout_status as enum (
  'requested',
  'approved',
  'paid',
  'rejected',
  'cancelled'
);

create type public.funding_expense_category as enum (
  'challenge_fee',
  'reset_fee',
  'platform',
  'tool',
  'course',
  'other'
);

-- Global catalogue.  A challenge preserves firm_name as a display snapshot so
-- users can track an unlisted firm without first waiting for catalogue curation.
create table public.prop_firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  website_url text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint prop_firms_name_not_blank check (btrim(name) <> ''),
  constraint prop_firms_slug_not_blank check (btrim(slug) <> '')
);

create unique index prop_firms_name_unique on public.prop_firms (lower(name));

create table public.funding_rule_templates (
  id uuid primary key default gen_random_uuid(),
  prop_firm_id uuid not null references public.prop_firms(id) on delete restrict,
  code text not null,
  name text not null,
  account_type public.funding_account_type not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint funding_rule_templates_code_not_blank check (btrim(code) <> ''),
  constraint funding_rule_templates_name_not_blank check (btrim(name) <> ''),
  unique (prop_firm_id, code)
);

-- A version is publishable rule data, not an audit diff.  Keeping all values in
-- relational columns makes the challenge form and compliance views queryable;
-- source_url/source_note preserve the evidence used when rules were curated.
create table public.funding_rule_template_versions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.funding_rule_templates(id) on delete cascade,
  version integer not null,
  effective_from date,
  effective_to date,
  phase_one_profit_target_percent numeric(7, 4) not null,
  phase_two_profit_target_percent numeric(7, 4),
  daily_drawdown_percent numeric(7, 4),
  max_drawdown_percent numeric(7, 4) not null,
  drawdown_type public.funding_drawdown_type not null default 'static',
  rule_timezone text not null default 'UTC',
  min_trading_days_per_phase integer not null default 0,
  max_daily_consistency_percent numeric(7, 4),
  profit_split_percent numeric(7, 4),
  phase_two_requires_new_account boolean not null default false,
  source_url text,
  source_note text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  constraint funding_rule_template_versions_version_positive check (version > 0),
  constraint funding_rule_template_versions_targets_valid check (
    phase_one_profit_target_percent >= 0
    and (phase_two_profit_target_percent is null or phase_two_profit_target_percent >= 0)
  ),
  constraint funding_rule_template_versions_drawdowns_valid check (
    (daily_drawdown_percent is null or daily_drawdown_percent > 0)
    and max_drawdown_percent > 0
    and max_drawdown_percent < 100
  ),
  constraint funding_rule_template_versions_min_days_valid check (min_trading_days_per_phase >= 0),
  constraint funding_rule_template_versions_consistency_valid check (
    max_daily_consistency_percent is null
    or max_daily_consistency_percent > 0 and max_daily_consistency_percent <= 100
  ),
  constraint funding_rule_template_versions_split_valid check (
    profit_split_percent is null
    or profit_split_percent >= 0 and profit_split_percent <= 100
  ),
  constraint funding_rule_template_versions_date_range_valid check (
    effective_to is null or effective_from is null or effective_to >= effective_from
  ),
  unique (template_id, version)
);

create unique index funding_rule_template_versions_one_current
  on public.funding_rule_template_versions (template_id)
  where effective_to is null;

-- A challenge is the commercial attempt.  Its phase rows can hold distinct MT5
-- account identifiers when a firm replaces the login after phase one.
create table public.funding_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  prop_firm_id uuid references public.prop_firms(id) on delete set null,
  firm_name text not null,
  account_identifier text,
  account_size numeric(18, 2) not null,
  currency_code char(3) not null default 'USD',
  purchase_cost numeric(18, 2) not null default 0,
  account_type public.funding_account_type not null,
  status public.funding_challenge_status not null default 'phase_one',
  started_on date not null,
  strategy_id uuid references public.strategies(id) on delete set null,
  notes text,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_challenges_firm_name_not_blank check (btrim(firm_name) <> ''),
  constraint funding_challenges_account_size_positive check (account_size > 0),
  constraint funding_challenges_purchase_cost_nonnegative check (purchase_cost >= 0),
  constraint funding_challenges_currency_code_valid check (currency_code ~ '^[A-Z]{3}$'),
  constraint funding_challenges_completed_after_start check (
    completed_at is null or completed_at::date >= started_on
  ),
  unique (id, user_id)
);

create index funding_challenges_user_started_idx
  on public.funding_challenges (user_id, started_on desc)
  where deleted_at is null;
create index funding_challenges_user_status_idx
  on public.funding_challenges (user_id, status)
  where deleted_at is null;

-- Create the initial operating phase atomically with its challenge.  This is
-- derived from the submitted account type and balance, not from simulated P&L.
-- Later transitions (phase one -> phase two -> funded) stay explicit user actions.
create or replace function public.trg_initialize_funding_challenge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.account_type = 'instant_funded' and new.status = 'phase_one' then
    new.status := 'funded';
  end if;
  return new;
end;
$$;

create trigger funding_challenges_initialize_before_insert
  before insert on public.funding_challenges
  for each row execute function public.trg_initialize_funding_challenge();

-- Copy of either a manual form or a template version.  source_template_version_id
-- documents provenance while these scalar values are the frozen rules used for
-- progress; editing future templates cannot change a purchased challenge.
create table public.funding_challenge_rules (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_template_version_id uuid references public.funding_rule_template_versions(id) on delete set null,
  phase_one_profit_target_percent numeric(7, 4) not null,
  phase_two_profit_target_percent numeric(7, 4),
  daily_drawdown_percent numeric(7, 4),
  max_drawdown_percent numeric(7, 4) not null,
  drawdown_type public.funding_drawdown_type not null default 'static',
  rule_timezone text not null default 'UTC',
  min_trading_days_per_phase integer not null default 0,
  max_daily_consistency_percent numeric(7, 4),
  profit_split_percent numeric(7, 4),
  phase_two_requires_new_account boolean not null default false,
  rule_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_challenge_rules_owner_fkey
    foreign key (challenge_id, user_id)
    references public.funding_challenges(id, user_id)
    on delete cascade,
  constraint funding_challenge_rules_one_per_challenge unique (challenge_id),
  constraint funding_challenge_rules_targets_valid check (
    phase_one_profit_target_percent >= 0
    and (phase_two_profit_target_percent is null or phase_two_profit_target_percent >= 0)
  ),
  constraint funding_challenge_rules_drawdowns_valid check (
    (daily_drawdown_percent is null or daily_drawdown_percent > 0)
    and max_drawdown_percent > 0
    and max_drawdown_percent < 100
  ),
  constraint funding_challenge_rules_min_days_valid check (min_trading_days_per_phase >= 0),
  constraint funding_challenge_rules_consistency_valid check (
    max_daily_consistency_percent is null
    or max_daily_consistency_percent > 0 and max_daily_consistency_percent <= 100
  ),
  constraint funding_challenge_rules_split_valid check (
    profit_split_percent is null
    or profit_split_percent >= 0 and profit_split_percent <= 100
  ),
  constraint funding_challenge_rules_snapshot_object check (jsonb_typeof(rule_snapshot) = 'object')
);

-- phase_number is 1/2 for evaluation and 3 for the funded account.  start_balance
-- is explicit because firms can reset capital or use a different funded amount.
create table public.funding_challenge_phases (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  phase_number smallint not null,
  phase_kind public.funding_phase_kind not null default 'evaluation',
  status public.funding_phase_status not null default 'active',
  account_identifier text,
  start_balance numeric(18, 2) not null,
  started_on date not null,
  completed_on date,
  completion_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_challenge_phases_owner_fkey
    foreign key (challenge_id, user_id)
    references public.funding_challenges(id, user_id)
    on delete cascade,
  constraint funding_challenge_phases_number_valid check (
    (phase_kind = 'evaluation' and phase_number in (1, 2))
    or (phase_kind = 'funded' and phase_number = 3)
  ),
  constraint funding_challenge_phases_start_balance_positive check (start_balance > 0),
  constraint funding_challenge_phases_completion_after_start check (
    completed_on is null or completed_on >= started_on
  ),
  unique (challenge_id, phase_number),
  unique (id, challenge_id, user_id),
  unique (id, user_id)
);

create index funding_challenge_phases_user_status_idx
  on public.funding_challenge_phases (user_id, status, started_on desc);

create or replace function public.trg_create_initial_funding_phase()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.funding_challenge_phases (
    challenge_id,
    user_id,
    phase_number,
    phase_kind,
    status,
    account_identifier,
    start_balance,
    started_on
  )
  values (
    new.id,
    new.user_id,
    case when new.account_type = 'instant_funded' then 3 else 1 end,
    case when new.account_type = 'instant_funded' then 'funded'::public.funding_phase_kind else 'evaluation'::public.funding_phase_kind end,
    'active',
    new.account_identifier,
    new.account_size,
    new.started_on
  );
  return new;
end;
$$;

create trigger funding_challenges_create_initial_phase_after_insert
  after insert on public.funding_challenges
  for each row execute function public.trg_create_initial_funding_phase();

-- Payouts record what was actually received as well as the gross request.  The
-- current bankroll calculation should use net_amount only for paid payouts.
create table public.funding_payouts (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  phase_id uuid,
  user_id uuid not null references public.profiles(id) on delete cascade,
  gross_amount numeric(18, 2) not null,
  net_amount numeric(18, 2) not null,
  status public.funding_payout_status not null default 'requested',
  requested_on date not null,
  paid_on date,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_payouts_challenge_owner_fkey
    foreign key (challenge_id, user_id)
    references public.funding_challenges(id, user_id)
    on delete cascade,
  constraint funding_payouts_phase_owner_fkey
    foreign key (phase_id, challenge_id, user_id)
    references public.funding_challenge_phases(id, challenge_id, user_id)
    on delete restrict,
  constraint funding_payouts_amounts_nonnegative check (gross_amount >= 0 and net_amount >= 0),
  constraint funding_payouts_paid_date_valid check (
    paid_on is null or paid_on >= requested_on
  ),
  constraint funding_payouts_paid_requires_date check (
    status <> 'paid' or paid_on is not null
  )
);

create index funding_payouts_user_paid_idx
  on public.funding_payouts (user_id, paid_on desc);

-- Challenge purchase_cost covers the initial fee.  This table is for reset fees
-- and separate tools/courses/platform costs shown in the tracker bankroll.
create table public.funding_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid,
  category public.funding_expense_category not null default 'other',
  description text not null,
  amount numeric(18, 2) not null,
  incurred_on date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint funding_expenses_challenge_owner_fkey
    foreign key (challenge_id, user_id)
    references public.funding_challenges(id, user_id)
    on delete restrict,
  constraint funding_expenses_description_not_blank check (btrim(description) <> ''),
  constraint funding_expenses_amount_positive check (amount > 0)
);

create index funding_expenses_user_incurred_idx
  on public.funding_expenses (user_id, incurred_on desc);

-- Link the existing journal to exactly one phase when it belongs to a prop
-- account.  The composite foreign key prevents a user from attaching a trade to
-- another user's challenge even if they know an UUID.
alter table public.trades
  add column funding_challenge_id uuid,
  add column funding_phase_id uuid,
  add constraint trades_funding_link_pair check (
    (funding_challenge_id is null) = (funding_phase_id is null)
  ),
  add constraint trades_funding_challenge_owner_fkey
    foreign key (funding_challenge_id, user_id)
    references public.funding_challenges(id, user_id)
    on delete restrict,
  add constraint trades_funding_phase_owner_fkey
    foreign key (funding_phase_id, funding_challenge_id, user_id)
    references public.funding_challenge_phases(id, challenge_id, user_id)
    on delete restrict;

create index trades_funding_phase_closed_idx
  on public.trades (funding_phase_id, traded_at, id)
  where deleted_at is null and status = 'closed' and funding_phase_id is not null;

-- Rule catalogue is readable by signed-in users.  It is curated by superadmins;
-- challenge, phase, payout and expense rows are private to their owner.
alter table public.prop_firms enable row level security;
alter table public.funding_rule_templates enable row level security;
alter table public.funding_rule_template_versions enable row level security;
alter table public.funding_challenges enable row level security;
alter table public.funding_challenge_rules enable row level security;
alter table public.funding_challenge_phases enable row level security;
alter table public.funding_payouts enable row level security;
alter table public.funding_expenses enable row level security;

create policy prop_firms_select_authenticated on public.prop_firms
  for select to authenticated using (true);
create policy prop_firms_superadmin_manage on public.prop_firms
  for all to authenticated
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

create policy funding_rule_templates_select_authenticated on public.funding_rule_templates
  for select to authenticated using (true);
create policy funding_rule_templates_superadmin_manage on public.funding_rule_templates
  for all to authenticated
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

create policy funding_rule_template_versions_select_authenticated on public.funding_rule_template_versions
  for select to authenticated using (true);
create policy funding_rule_template_versions_superadmin_manage on public.funding_rule_template_versions
  for all to authenticated
  using (public.is_superadmin(auth.uid()))
  with check (public.is_superadmin(auth.uid()));

create policy funding_challenges_owner_all on public.funding_challenges
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      strategy_id is null
      or exists (
        select 1 from public.strategies s
        where s.id = funding_challenges.strategy_id
          and s.user_id = (select auth.uid())
      )
    )
  );

create policy funding_challenge_rules_owner_all on public.funding_challenge_rules
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.funding_challenges c
      where c.id = funding_challenge_rules.challenge_id
        and c.user_id = (select auth.uid())
    )
  );

create policy funding_challenge_phases_owner_all on public.funding_challenge_phases
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.funding_challenges c
      where c.id = funding_challenge_phases.challenge_id
        and c.user_id = (select auth.uid())
    )
  );

create policy funding_payouts_owner_all on public.funding_payouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.funding_challenges c
      where c.id = funding_payouts.challenge_id
        and c.user_id = (select auth.uid())
    )
  );

create policy funding_expenses_owner_all on public.funding_expenses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      challenge_id is null
      or exists (
        select 1 from public.funding_challenges c
        where c.id = funding_expenses.challenge_id
          and c.user_id = (select auth.uid())
      )
    )
  );

grant select, insert, update, delete on public.prop_firms,
  public.funding_rule_templates, public.funding_rule_template_versions to authenticated;
grant select, insert, update, delete on public.funding_challenges,
  public.funding_challenge_rules, public.funding_challenge_phases,
  public.funding_payouts, public.funding_expenses to authenticated;

-- Closed-trade calculations.  They intentionally reflect the journal only:
-- trailing/equity firms can impose intraday limits that cannot be proven from a
-- closed-trade ledger.  The UI must state that limitation until MT5/broker equity
-- snapshots are imported.
create or replace view public.v_funding_phase_trade_daily
with (security_invoker = true)
as
select
  t.user_id,
  t.funding_challenge_id as challenge_id,
  t.funding_phase_id as phase_id,
  (t.traded_at at time zone r.rule_timezone)::date as trading_day,
  count(*) as closed_trade_count,
  sum(t.pnl_amount) as daily_pnl
from public.trades t
join public.funding_challenge_rules r on r.challenge_id = t.funding_challenge_id
where t.deleted_at is null
  and t.status = 'closed'
  and t.funding_phase_id is not null
group by t.user_id, t.funding_challenge_id, t.funding_phase_id,
  (t.traded_at at time zone r.rule_timezone)::date;

create or replace view public.v_funding_phase_progress
with (security_invoker = true)
as
with closed_trades as (
  select
    p.id as phase_id,
    p.challenge_id,
    p.user_id,
    p.start_balance,
    p.phase_number,
    p.phase_kind,
    t.id as trade_id,
    t.traded_at,
    coalesce(t.pnl_amount, 0) as pnl_amount,
    sum(coalesce(t.pnl_amount, 0)) over (
      partition by p.id order by t.traded_at, t.id rows unbounded preceding
    ) as cumulative_pnl
  from public.funding_challenge_phases p
  left join public.trades t
    on t.funding_phase_id = p.id
    and t.deleted_at is null
    and t.status = 'closed'
), trade_path as (
  select
    *,
    start_balance + cumulative_pnl as running_balance,
    max(start_balance + cumulative_pnl) over (
      partition by phase_id order by traded_at, trade_id rows unbounded preceding
    ) as running_peak_balance
  from closed_trades
  where trade_id is not null
), phase_totals as (
  select
    p.id as phase_id,
    coalesce(sum(tp.pnl_amount), 0) as net_pnl,
    count(tp.trade_id) as closed_trade_count,
    count(distinct tp.traded_at::date) as trading_day_count,
    coalesce(min(tp.running_balance), p.start_balance) as lowest_realized_balance,
    coalesce(min(tp.running_balance - tp.running_peak_balance), 0) as worst_trailing_drawdown_amount
  from public.funding_challenge_phases p
  left join trade_path tp on tp.phase_id = p.id
  group by p.id, p.start_balance
), daily_running as (
  select
    d.phase_id,
    p.start_balance,
    d.trading_day,
    d.daily_pnl,
    p.start_balance + sum(d.daily_pnl) over (
      partition by d.phase_id order by d.trading_day rows unbounded preceding
    ) as end_of_day_balance
  from public.v_funding_phase_trade_daily d
  join public.funding_challenge_phases p on p.id = d.phase_id
), daily_path as (
  select
    *,
    max(end_of_day_balance) over (
      partition by phase_id order by trading_day rows unbounded preceding
    ) as end_of_day_peak_balance
  from daily_running
), daily_totals as (
  select
    phase_id,
    min(daily_pnl) as worst_daily_pnl,
    max(daily_pnl) filter (where daily_pnl > 0) as best_positive_daily_pnl,
    min(end_of_day_balance - end_of_day_peak_balance) as worst_end_of_day_trailing_drawdown_amount
  from daily_path
  group by phase_id
)
select
  p.id as phase_id,
  p.challenge_id,
  p.user_id,
  p.phase_number,
  p.phase_kind,
  p.status as stored_status,
  p.start_balance,
  r.drawdown_type,
  coalesce(pt.net_pnl, 0) as net_pnl,
  p.start_balance + coalesce(pt.net_pnl, 0) as realized_balance,
  coalesce(pt.closed_trade_count, 0) as closed_trade_count,
  coalesce(pt.trading_day_count, 0) as trading_day_count,
  coalesce(dt.worst_daily_pnl, 0) as worst_daily_pnl,
  coalesce(dt.best_positive_daily_pnl, 0) as best_positive_daily_pnl,
  p.start_balance * r.daily_drawdown_percent / 100 as daily_drawdown_limit_amount,
  p.start_balance * r.max_drawdown_percent / 100 as max_drawdown_limit_amount,
  p.start_balance - coalesce(pt.lowest_realized_balance, p.start_balance) as static_drawdown_amount,
  abs(coalesce(pt.worst_trailing_drawdown_amount, 0)) as trailing_drawdown_amount,
  abs(coalesce(dt.worst_end_of_day_trailing_drawdown_amount, 0)) as end_of_day_trailing_drawdown_amount,
  case when p.phase_number = 1 then r.phase_one_profit_target_percent
       when p.phase_number = 2 then r.phase_two_profit_target_percent
       else null end as profit_target_percent,
  case when p.phase_number = 1 then p.start_balance * r.phase_one_profit_target_percent / 100
       when p.phase_number = 2 then p.start_balance * r.phase_two_profit_target_percent / 100
       else null end as profit_target_amount,
  case when p.phase_number = 1 then coalesce(pt.net_pnl, 0) >= p.start_balance * r.phase_one_profit_target_percent / 100
       when p.phase_number = 2 then coalesce(pt.net_pnl, 0) >= p.start_balance * r.phase_two_profit_target_percent / 100
       else false end as profit_target_reached,
  coalesce(pt.trading_day_count, 0) >= r.min_trading_days_per_phase as minimum_days_reached,
  case
    when r.daily_drawdown_percent is null then false
    else coalesce(dt.worst_daily_pnl, 0) <= -(p.start_balance * r.daily_drawdown_percent / 100)
  end as daily_drawdown_breached,
  case
    when r.drawdown_type = 'trailing' then abs(coalesce(pt.worst_trailing_drawdown_amount, 0)) >= p.start_balance * r.max_drawdown_percent / 100
    when r.drawdown_type = 'end_of_day' then abs(coalesce(dt.worst_end_of_day_trailing_drawdown_amount, 0)) >= p.start_balance * r.max_drawdown_percent / 100
    else p.start_balance - coalesce(pt.lowest_realized_balance, p.start_balance) >= p.start_balance * r.max_drawdown_percent / 100
  end as max_drawdown_breached,
  case
    when coalesce(pt.net_pnl, 0) <= 0 then null
    when r.max_daily_consistency_percent is null then null
    else coalesce(dt.best_positive_daily_pnl, 0) / nullif(coalesce(pt.net_pnl, 0), 0) * 100
  end as best_day_profit_share_percent,
  case
    when r.max_daily_consistency_percent is null then false
    when coalesce(pt.net_pnl, 0) <= 0 then false
    else coalesce(dt.best_positive_daily_pnl, 0) / nullif(coalesce(pt.net_pnl, 0), 0) * 100 > r.max_daily_consistency_percent
  end as consistency_breached,
  case
    when p.phase_kind <> 'evaluation' then false
    when p.phase_number = 2 and r.phase_two_profit_target_percent is null then false
    when (case when p.phase_number = 1 then coalesce(pt.net_pnl, 0) >= p.start_balance * r.phase_one_profit_target_percent / 100
               when p.phase_number = 2 then coalesce(pt.net_pnl, 0) >= p.start_balance * r.phase_two_profit_target_percent / 100
               else false end)
      and coalesce(pt.trading_day_count, 0) >= r.min_trading_days_per_phase
      and not (case when r.daily_drawdown_percent is null then false
                    else coalesce(dt.worst_daily_pnl, 0) <= -(p.start_balance * r.daily_drawdown_percent / 100) end)
      and not (case when r.drawdown_type = 'trailing'
                    then abs(coalesce(pt.worst_trailing_drawdown_amount, 0)) >= p.start_balance * r.max_drawdown_percent / 100
                    when r.drawdown_type = 'end_of_day'
                    then abs(coalesce(dt.worst_end_of_day_trailing_drawdown_amount, 0)) >= p.start_balance * r.max_drawdown_percent / 100
                    else p.start_balance - coalesce(pt.lowest_realized_balance, p.start_balance) >= p.start_balance * r.max_drawdown_percent / 100 end)
    then true else false
  end as pass_eligible_from_closed_trades
from public.funding_challenge_phases p
join public.funding_challenge_rules r on r.challenge_id = p.challenge_id
left join phase_totals pt on pt.phase_id = p.id
left join daily_totals dt on dt.phase_id = p.id;

grant select on public.v_funding_phase_trade_daily, public.v_funding_phase_progress to authenticated;

comment on view public.v_funding_phase_progress is
  'Compliance indicators computed from linked closed journal trades. Equity and intraday trailing limits require broker/MT5 equity snapshots for a definitive result.';
