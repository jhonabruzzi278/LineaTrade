-- Extiende profiles con las respuestas del wizard de onboarding (src/pages/Onboarding.tsx).
-- No existían en el schema original porque el wizard se diseñó después; se agregan aquí
-- como migración nueva (nunca editando 20260701220001_extensions_and_profiles.sql ya aplicada).
alter table public.profiles
  add column trading_experience text,   -- 'lt_1y' | '1_3y' | '3_5y' | 'gt_5y'
  add column account_type      text,    -- 'personal' | 'prop_firm' | 'not_started'
  add column primary_broker    text,    -- id de docs/../data/brokers.ts, o 'custom:<nombre>'
  add column traded_instruments text[], -- ej. {'forex','crypto'}
  add column onboarding_goals   text[], -- ej. {'journal','analyze'}
  add column acquisition_source text;   -- 'google' | 'ai_tools' | ... | 'other'
