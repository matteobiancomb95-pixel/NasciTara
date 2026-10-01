-- NasciTara 0.7: La mamma (calendario, integratori, notebook), promemoria via email e limiti AI.
-- Date e ore sono quelle che la mamma inserisce, sempre nel fuso Europe/Rome.
begin;

create table public.visits (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 kind text not null check (char_length(kind) between 1 and 80),
 visit_date date not null,
 visit_time time not null,
 place text not null default '' check (char_length(place) <= 120),
 notes text not null default '' check (char_length(notes) <= 500),
 remind boolean not null default true,
 created_at timestamptz not null default now()
);
create index visits_owner_date on public.visits(owner_id, visit_date);

create table public.supplements (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 80),
 source text not null check (source in ('ai','doctor')),
 dose text not null default '' check (char_length(dose) <= 120),
 times text[] not null check (cardinality(times) between 1 and 4 and times <@ array['08:00','12:00','19:00','22:00']),
 start_date date not null,
 end_date date check (end_date is null or end_date >= start_date),
 leaflet_quote text not null default '' check (char_length(leaflet_quote) <= 300),
 remind boolean not null default true,
 created_at timestamptz not null default now()
);
create index supplements_owner on public.supplements(owner_id);

create table public.notes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 tag text not null check (tag in ('movimenti','sintomi','umore','medico')),
 body text not null check (char_length(body) between 1 and 1000),
 ga_label text not null default '' check (char_length(ga_label) <= 8),
 created_at timestamptz not null default now()
);
create index notes_owner_created on public.notes(owner_id, created_at desc);

-- Solo la proprietaria legge e modifica le proprie righe.
do $$
declare t text;
begin
 foreach t in array array['visits','supplements','notes'] loop
  execute format('alter table public.%I enable row level security', t);
  execute format('revoke all on public.%I from public, anon, authenticated', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('grant all on public.%I to service_role', t);
  execute format('create policy own_rows on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))', t);
 end loop;
end $$;

-- Un massimo per persona: 30 visite e 12 integratori attivi, 500 note.
create function public.limit_rows() returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer; cap integer;
begin
 cap := case tg_table_name when 'visits' then 30 when 'supplements' then 12 else 500 end;
 execute format('select count(*) from public.%I where owner_id = $1', tg_table_name) into n using new.owner_id;
 if n >= cap then raise exception 'limit_reached'; end if;
 return new;
end $$;
create trigger visits_limit before insert on public.visits for each row execute function public.limit_rows();
create trigger supplements_limit before insert on public.supplements for each row execute function public.limit_rows();
create trigger notes_limit before insert on public.notes for each row execute function public.limit_rows();

-- Promemoria: una riga per invio, la chiave impedisce i doppioni anche se il job gira due volte.
create table public.reminder_log (
 kind text not null check (kind in ('visit','supplement')),
 ref_id uuid not null,
 slot timestamptz not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'processing' check (status in ('processing','accepted','failed','unknown')),
 provider_id text,
 created_at timestamptz not null default now(),
 primary key (kind, ref_id, slot)
);
alter table public.reminder_log enable row level security;
revoke all on public.reminder_log from public, anon, authenticated;
grant all on public.reminder_log to service_role;

-- Riserva i promemoria scaduti negli ultimi 20 minuti e restituisce cosa inviare.
-- Visite: 6 ore prima. Integratori: all'orario di assunzione, tra data di inizio e di fine.
create function public.claim_due_reminders()
returns table(kind text, ref_id uuid, slot timestamptz, email text, lang text, title text, detail text, at_local text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare today date := (now() at time zone 'Europe/Rome')::date;
begin
 return query
 with due as (
  select 'visit'::text k, v.id, ((v.visit_date + v.visit_time) at time zone 'Europe/Rome') - interval '6 hours' s, v.owner_id o,
   v.kind t, concat_ws(' · ', nullif(v.place, ''), nullif(v.notes, '')) d,
   to_char(v.visit_date, 'DD/MM') || ' ' || to_char(v.visit_time, 'HH24:MI') l
  from public.visits v where v.remind
  union all
  select 'supplement', s.id, ((day + tm::time) at time zone 'Europe/Rome'), s.owner_id, s.name, s.dose, tm
  from public.supplements s
  cross join lateral unnest(s.times) tm
  cross join lateral (values (today - 1), (today)) days(day)
  where s.remind and day >= s.start_date and (s.end_date is null or day <= s.end_date)
 ), claimed as (
  insert into public.reminder_log(kind, ref_id, slot, owner_id)
  select due.k, due.id, due.s, due.o from due
  where due.s <= now() and due.s > now() - interval '20 minutes'
  on conflict do nothing
  returning reminder_log.kind, reminder_log.ref_id, reminder_log.slot, reminder_log.owner_id
 )
 select c.kind, c.ref_id, c.slot, u.email::text, coalesce(u.raw_user_meta_data->>'lang', 'it'), due.t, due.d, due.l
 from claimed c
 join due on due.k = c.kind and due.id = c.ref_id and due.s = c.slot
 join auth.users u on u.id = c.owner_id
 where u.email is not null and u.email_confirmed_at is not null;
end $$;
revoke all on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;

-- AI: tetto giornaliero per persona e per funzione.
create table public.ai_usage (
 owner_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 mode text not null check (mode in ('supplement','insight','assistant')),
 calls integer not null default 0,
 primary key (owner_id, day, mode)
);
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from public, anon, authenticated;
grant all on public.ai_usage to service_role;

create function public.reserve_ai_call(p_owner uuid, p_mode text, p_limit integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
 insert into public.ai_usage(owner_id, day, mode, calls) values (p_owner, (now() at time zone 'Europe/Rome')::date, p_mode, 1)
 on conflict (owner_id, day, mode) do update set calls = public.ai_usage.calls + 1
 returning calls into used;
 return used <= p_limit;
end $$;
revoke all on function public.reserve_ai_call(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.reserve_ai_call(uuid, text, integer) to service_role;

-- La tua voce: un invio al minuto e 10 al giorno per persona (i messaggi stanno nel Google Sheet).
create table public.feedback_log (
 owner_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index feedback_log_owner on public.feedback_log(owner_id, created_at desc);
alter table public.feedback_log enable row level security;
revoke all on public.feedback_log from public, anon, authenticated;
grant all on public.feedback_log to service_role;

create function public.reserve_feedback(p_owner uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 if exists(select 1 from public.feedback_log where owner_id = p_owner and created_at > now() - interval '1 minute')
  or (select count(*) from public.feedback_log where owner_id = p_owner and created_at > now() - interval '1 day') >= 10
 then return false; end if;
 insert into public.feedback_log(owner_id) values (p_owner);
 return true;
end $$;
revoke all on function public.reserve_feedback(uuid) from public, anon, authenticated;
grant execute on function public.reserve_feedback(uuid) to service_role;

-- Job ogni 5 minuti. URL e segreto stanno nel Vault (nomi: project_url, reminders_cron_secret):
-- senza, la chiamata fallisce e non parte nessuna email.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('nascitara-reminders', '*/5 * * * *', $cron$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
   (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
  body := '{}'::jsonb,
  timeout_milliseconds := 30000)
$cron$);

commit;
