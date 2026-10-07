-- Keep child records attached to resources owned by the same authenticated user.
-- Earlier policies checked only the denormalized user_id on the child row. A client
-- could therefore create an otherwise private child row that referenced another
-- user's trade or conversation if it learned that parent's UUID.

-- The SECURITY DEFINER helper is called by RLS policies and admin RPCs with
-- auth.uid(). Refuse caller-supplied IDs that are not the current user's ID so the
-- public function cannot be used as an oracle to enumerate superadmin accounts.
create or replace function public.is_superadmin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select uid is not null
    and uid = (select auth.uid())
    and exists (
      select 1
      from public.profiles p
      where p.id = uid
        and p.role = 'superadmin'
    );
$$;

-- Restore the options contract multiplier. The migration that added automatic trade
-- duration replaced this trigger and accidentally dropped the existing x100 premium
-- multiplier, even though the UI stores options size as contracts and price as
-- premium per share. Closed options trades could therefore report PnL 100x too small.
create or replace function public.trg_calculate_trade_pnl()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_market public.instrument_market;
  v_multiplier numeric := 1;
begin
  select i.market
    into v_market
    from public.instruments i
    where i.id = new.instrument_id;

  if v_market = 'options' then
    v_multiplier := 100;
  end if;

  if new.status = 'closed' and new.exit_price is not null then
    if new.side = 'long' then
      new.pnl_amount = (new.exit_price - new.entry_price)
        * coalesce(new.position_size, 0) * v_multiplier
        - coalesce(new.commission, 0);
    else
      new.pnl_amount = (new.entry_price - new.exit_price)
        * coalesce(new.position_size, 0) * v_multiplier
        - coalesce(new.commission, 0);
    end if;

    if new.stop_loss is not null
       and new.stop_loss <> new.entry_price
       and coalesce(new.position_size, 0) > 0 then
      new.pnl_r = round(
        new.pnl_amount
        / (abs(new.entry_price - new.stop_loss) * new.position_size * v_multiplier),
        4
      );
    else
      new.pnl_r = null;
    end if;

    if (tg_op = 'INSERT' and new.duration_minutes is null)
       or (tg_op = 'UPDATE' and old.status is distinct from 'closed') then
      new.duration_minutes = greatest(
        0,
        round(extract(epoch from (now() - new.traded_at)) / 60)
      )::integer;
    end if;
  end if;

  return new;
end;
$$;

-- Recompute derived results for already-closed option trades through the same
-- protected trigger. The source fields remain untouched; updated_at records that the
-- derived result was repaired. Other markets are intentionally excluded because the
-- app does not yet define whether their quantity means units, lots, or contracts.
update public.trades t
set updated_at = t.updated_at
from public.instruments i
where i.id = t.instrument_id
  and i.market = 'options'
  and t.status = 'closed'
  and t.exit_price is not null;

drop policy if exists "trade_orders_owner_all" on public.trade_orders;
create policy "trade_orders_owner_all"
  on public.trade_orders
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.trades t
      where t.id = trade_orders.trade_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists "trade_threads_owner_all" on public.trade_threads;
-- A composite FK keeps nested replies in the same trade without querying the
-- RLS-protected trade_threads table from its own policy (which would recurse).
create unique index if not exists trade_threads_id_trade_id_uniq
  on public.trade_threads (id, trade_id);

alter table public.trade_threads
  drop constraint if exists trade_threads_parent_id_fkey;
alter table public.trade_threads
  add constraint trade_threads_parent_trade_fkey
  foreign key (parent_id, trade_id)
  references public.trade_threads (id, trade_id)
  not valid;

create policy "trade_threads_owner_all"
  on public.trade_threads
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.trades t
      where t.id = trade_threads.trade_id
        and t.user_id = (select auth.uid())
    )
  );

drop policy if exists trade_confluences_owner_all on public.trade_confluences;
create policy trade_confluences_owner_all
  on public.trade_confluences
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.trades t
      where t.id = trade_confluences.trade_id
        and t.user_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.confluence_types ct
      where ct.id = trade_confluences.confluence_type_id
        and (ct.is_system or ct.user_id = (select auth.uid()))
    )
  );

drop policy if exists chart_annotations_owner_all on public.chart_annotations;
create policy chart_annotations_owner_all
  on public.chart_annotations
  for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      backtest_session_id is null
      or exists (
        select 1
        from public.backtest_sessions s
        where s.id = chart_annotations.backtest_session_id
          and s.user_id = (select auth.uid())
      )
    )
    and (
      trade_id is null
      or exists (
        select 1
        from public.trades t
        where t.id = chart_annotations.trade_id
          and t.user_id = (select auth.uid())
      )
    )
    and exists (
      select 1
      from public.confluence_types ct
      where ct.id = chart_annotations.confluence_type_id
        and (ct.is_system or ct.user_id = (select auth.uid()))
    )
  );

drop policy if exists ai_coach_messages_select_own on public.ai_coach_messages;
create policy ai_coach_messages_select_own
  on public.ai_coach_messages
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists ai_coach_messages_insert_user_role on public.ai_coach_messages;
create policy ai_coach_messages_insert_user_role
  on public.ai_coach_messages
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'user'
    and exists (
      select 1
      from public.ai_coach_conversations c
      where c.id = ai_coach_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );
