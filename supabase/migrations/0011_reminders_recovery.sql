-- Apply before deploying the revised send-reminders function.
begin;
alter table public.reminder_log
 add column attempts integer not null default 1 check (attempts > 0),
 add column retryable boolean not null default false,
 add column next_attempt_at timestamptz,
 add column last_error text;

create or replace function public.claim_due_reminders()
returns table(kind text, ref_id uuid, slot timestamptz, email text, lang text, title text, detail text, at_local text)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare today date := (now() at time zone 'Europe/Rome')::date;
begin
 return query
 with candidates as (
  select 'visit'::text k, v.id, ((v.visit_date + v.visit_time) at time zone 'Europe/Rome') - interval '6 hours' s, v.owner_id o,
   v.kind t, concat_ws(' · ', nullif(v.place, ''), nullif(v.notes, '')) d,
   to_char(v.visit_date, 'DD/MM/YYYY') || ' ' || to_char(v.visit_time, 'HH24:MI') l
  from public.visits v
  where v.remind and ((v.visit_date + v.visit_time) at time zone 'Europe/Rome') > now()
  union all
  select 'supplement', s.id, ((day + tm::time) at time zone 'Europe/Rome'), s.owner_id, s.name, s.dose, tm
  from public.supplements s
  cross join lateral unnest(s.times) tm
  cross join lateral (values (today - 1), (today)) days(day)
  where s.remind and day >= s.start_date and (s.end_date is null or day <= s.end_date)
 ), due as materialized (
  select c.* from candidates c join auth.users u on u.id = c.o
  left join public.reminder_log log on log.kind = c.k and log.ref_id = c.id and log.slot = c.s
  where u.email is not null and u.email_confirmed_at is not null and c.s <= now()
   -- A visit reminder can recover until the appointment starts; do not send old supplement reminders.
   and (c.k = 'visit' or c.s > now() - interval '20 minutes')
   and (log.ref_id is null or (log.status = 'failed' and log.retryable and log.attempts < 6 and log.next_attempt_at <= now()))
  order by c.s, c.k, c.id limit 5
 ), claimed as (
  insert into public.reminder_log as log(kind, ref_id, slot, owner_id)
  select due.k, due.id, due.s, due.o from due
  on conflict (kind, ref_id, slot) do update
   set status = 'processing', attempts = log.attempts + 1, retryable = false, next_attempt_at = null, last_error = null
   where log.status = 'failed' and log.retryable and log.attempts < 6 and log.next_attempt_at <= now()
  returning log.kind, log.ref_id, log.slot, log.owner_id
 )
 select c.kind, c.ref_id, c.slot, u.email::text, coalesce(u.raw_user_meta_data->>'lang', 'it'), due.t, due.d, due.l
 from claimed c join due on due.k = c.kind and due.id = c.ref_id and due.s = c.slot
 join auth.users u on u.id = c.owner_id;
end $$;
revoke all on function public.claim_due_reminders() from public, anon, authenticated;
grant execute on function public.claim_due_reminders() to service_role;

select cron.schedule('nascitara-reminders', '* * * * *', $cron$
 select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret',
   (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')),
  body := '{}'::jsonb, timeout_milliseconds := 30000)
$cron$);
commit;
