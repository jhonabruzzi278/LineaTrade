-- Completa los 8 campos psicológicos que el plan de backtesting había dejado afuera a
-- propósito (ver comentario en 20260727110000_backtesting_mvp.sql: "agregar columnas
-- que ninguna UI usa viola YAGNI — se suman en la misma migración que construya esa
-- UI"). Esta vez sí hay UI en el mismo cambio: PsychologySection.tsx se extiende para
-- capturar los 8 en el mismo commit (ver src/components/trade/PsychologySection.tsx).
alter table public.trades
  add column fear_level smallint check (fear_level between 1 and 10),
  add column anxiety_level smallint check (anxiety_level between 1 and 10),
  add column closed_early boolean,
  add column moved_take_profit boolean,
  add column entered_impulsively boolean,
  add column hesitated boolean,
  add column overconfidence boolean,
  add column had_distractions boolean;

comment on column public.trades.fear_level is
  'Autoreportado, 1-10, capturado antes de entrar (junto a confidence_level/stress_level).';
comment on column public.trades.anxiety_level is
  'Autoreportado, 1-10, capturado antes de entrar (junto a confidence_level/stress_level).';
