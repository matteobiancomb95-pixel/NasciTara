-- NasciTara — raccolta email dalla pagina di atterraggio.
--
-- Qui finisce SOLO l'indirizzo email e il consenso. I dati della gravidanza e
-- delle ecografie non arrivano mai al server: il calcolo e' interamente sul
-- dispositivo dell'utente. Le tabelle pregnancies e ultrasounds di 0001
-- esistono per un salvataggio futuro ed esplicito, non per questo flusso.

create table if not exists public.email_signups (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  email         text not null,
  -- consenso esplicito: senza, la riga non deve esistere
  consent       boolean not null default false check (consent = true),
  -- lingua dell'interfaccia al momento dell'iscrizione, per scrivere nella lingua giusta
  lang          text not null default 'it' check (lang in ('it', 'en')),
  source        text not null default 'landing',
  unsubscribed_at timestamptz
);

comment on table public.email_signups is
  'Solo email e consenso. Nessun dato clinico: il calcolo resta sul client.';

create unique index if not exists email_signups_email_uniq
  on public.email_signups (lower(email))
  where unsubscribed_at is null;

-- RLS: la pagina di atterraggio deve poter INSERIRE con la chiave anon, ma
-- nessuno deve poter LEGGERE la lista degli iscritti da client.
alter table public.email_signups enable row level security;

drop policy if exists "chiunque puo iscriversi" on public.email_signups;
create policy "chiunque puo iscriversi"
  on public.email_signups for insert
  to anon, authenticated
  with check (consent = true);

-- Nessuna policy di select: la lettura resta alla sola service_role, lato server.
