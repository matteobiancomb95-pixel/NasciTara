-- NasciTara 0.3: optional context. No fetal-estimation formula changes.
begin;
alter table public.pregnancies add column if not exists mother_observation_weight_kg numeric(5,2)
  check (mother_observation_weight_kg > 0 and mother_observation_weight_kg <= 300);
alter table public.ultrasounds add column if not exists mother_observation_weight_kg numeric(5,2)
  check (mother_observation_weight_kg > 0 and mother_observation_weight_kg <= 300);
comment on column public.pregnancies.mother_weight_kg is 'Pre-pregnancy maternal weight; delta is calculated, never imputed.';
comment on column public.ultrasounds.mother_observation_weight_kg is 'Optional maternal weight on exam date, NasciTara context only.';
-- Clinical records remain inaccessible through public API until authenticated ownership is implemented.
alter table public.pregnancies enable row level security;
alter table public.ultrasounds enable row level security;
revoke all on public.pregnancies, public.ultrasounds from anon, authenticated;
commit;
