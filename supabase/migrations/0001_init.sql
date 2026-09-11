-- NasciTara — schema iniziale
--
-- Solo struttura: l'autenticazione non e' ancora implementata (vedi in fondo
-- il blocco RLS, deliberatamente commentato).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- pregnancies
create table if not exists public.pregnancies (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- proprietario: resta nullo finche' non c'e' auth
  owner_id           uuid,

  label              text,

  -- epoca gestazionale di riferimento
  ga_weeks           smallint not null check (ga_weeks between 12 and 42),
  ga_days            smallint not null default 0 check (ga_days between 0 and 6),
  reference_date     date     not null,

  -- dati costituzionali: tutti facoltativi
  mother_weight_kg   numeric(5,2) check (mother_weight_kg between 30 and 250),
  mother_height_cm   numeric(5,1) check (mother_height_cm between 120 and 220),
  mother_age_years   smallint     check (mother_age_years between 12 and 70),
  father_weight_kg   numeric(5,2) check (father_weight_kg between 30 and 300),
  father_height_cm   numeric(5,1) check (father_height_cm between 120 and 240),
  father_age_years   smallint     check (father_age_years between 12 and 90)
);

comment on table  public.pregnancies is 'Una gravidanza seguita in NasciTara.';
comment on column public.pregnancies.reference_date is 'Data a cui vale ga_weeks + ga_days.';
comment on column public.pregnancies.mother_age_years is 'Raccolta come contesto: non entra nel calcolo del peso.';
comment on column public.pregnancies.father_age_years is 'Raccolta come contesto: non entra nel calcolo del peso.';

-- ---------------------------------------------------------------- ultrasounds
create table if not exists public.ultrasounds (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  pregnancy_id  uuid not null references public.pregnancies(id) on delete cascade,

  exam_date     date not null,

  -- le quattro misure del referto, in millimetri
  hc_mm         numeric(5,1) not null check (hc_mm  between 20 and 500),
  ac_mm         numeric(5,1) not null check (ac_mm  between 20 and 500),
  fl_mm         numeric(5,1) not null check (fl_mm  between  5 and 120),
  bpd_mm        numeric(5,1) not null check (bpd_mm between 10 and 150),

  note          text
);

comment on table public.ultrasounds is 'Una ecografia: le quattro misure biometriche, in millimetri.';

create index if not exists ultrasounds_pregnancy_date_idx
  on public.ultrasounds (pregnancy_id, exam_date);

-- una sola ecografia per data, per gravidanza
create unique index if not exists ultrasounds_pregnancy_date_uniq
  on public.ultrasounds (pregnancy_id, exam_date);

-- ------------------------------------------------------------ updated_at auto
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pregnancies_set_updated_at on public.pregnancies;
create trigger pregnancies_set_updated_at
  before update on public.pregnancies
  for each row execute function public.set_updated_at();

drop trigger if exists ultrasounds_set_updated_at on public.ultrasounds;
create trigger ultrasounds_set_updated_at
  before update on public.ultrasounds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS
-- Da abilitare INSIEME all'auth, non prima: accendere RLS senza policy
-- renderebbe le tabelle inaccessibili alla chiave anon.
--
-- alter table public.pregnancies enable row level security;
-- alter table public.ultrasounds enable row level security;
--
-- create policy "proprietario legge e scrive la propria gravidanza"
--   on public.pregnancies for all
--   using (owner_id = auth.uid()) with check (owner_id = auth.uid());
--
-- create policy "proprietario legge e scrive le proprie ecografie"
--   on public.ultrasounds for all
--   using (exists (select 1 from public.pregnancies p
--                  where p.id = pregnancy_id and p.owner_id = auth.uid()))
--   with check (exists (select 1 from public.pregnancies p
--                       where p.id = pregnancy_id and p.owner_id = auth.uid()));
