-- LineaTrade uses Flow for payments and recurring subscriptions.
-- Existing columns are provider-neutral; only the allowed/default provider
-- needs to change. No customer or subscription data is deleted.

alter table public.billing_customers
  drop constraint billing_customers_provider_check;
alter table public.billing_customers
  alter column provider set default 'flow';
alter table public.billing_customers
  add constraint billing_customers_provider_check check (provider in ('flow'));

alter table public.subscriptions
  drop constraint subscriptions_provider_check;
alter table public.subscriptions
  alter column provider set default 'flow';
alter table public.subscriptions
  add constraint subscriptions_provider_check check (provider in ('flow'));

alter table public.billing_webhook_events
  drop constraint billing_webhook_events_provider_check;
alter table public.billing_webhook_events
  alter column provider set default 'flow';
alter table public.billing_webhook_events
  add constraint billing_webhook_events_provider_check check (provider in ('flow'));

comment on table public.billing_webhook_events is
  'Idempotent Flow callback tokens and verified payloads obtained from the Flow API.';
