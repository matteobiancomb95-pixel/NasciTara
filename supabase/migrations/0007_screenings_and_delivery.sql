begin;

create or replace function public.record_usage(p_id uuid, p_secret uuid, p_action text, p_email text default null, p_release text default '0.4')
returns void language plpgsql security definer set search_path = '' as $$
declare stage integer;
begin
 if p_release not in ('0.4','0.5','0.51') then raise exception 'Invalid release'; end if;
 if p_id is null or p_secret is null or p_action is null or p_action not in
 ('start','identify','landing','pregnancy','measurements','dashboard','heartbeat','pdf_download','pdf_error','import_started','import_confirmed','import_error') then
  raise exception 'Invalid usage event';
 end if;
 if p_action = 'start' then
  insert into public.usage_sessions(id,secret,release,consent_version) values(p_id,p_secret,p_release,case when p_release='0.51' then '0.51' else '0.4' end) on conflict(id) do nothing;
  return;
 end if;
 if p_action = 'identify' then
  if p_email is null or length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email'; end if;
  update public.usage_sessions set email=lower(trim(p_email)), last_seen_at=now()
   where id=p_id and secret=p_secret and started_at>now()-interval '24 hours' and (email is null or email=lower(trim(p_email)));
  return;
 end if;
 stage := case p_action when 'landing' then 0 when 'pregnancy' then 1 when 'measurements' then 2 when 'dashboard' then 3 else null end;
 update public.usage_sessions set
 last_seen_at=now(),
 last_step=case when stage is not null then p_action else last_step end,
 max_stage=greatest(max_stage,coalesce(stage,0)),
 reached_steps=case when stage is not null and not p_action=any(reached_steps) then array_append(reached_steps,p_action) else reached_steps end,
 completed_at=case when p_action='dashboard' then coalesce(completed_at,now()) else completed_at end,
 pdf_downloaded_at=case when p_action='pdf_download' then now() else pdf_downloaded_at end,
 pdf_error_at=case when p_action='pdf_error' then now() else pdf_error_at end,
 import_started_at=case when p_action='import_started' then now() else import_started_at end,
 import_confirmed_at=case when p_action='import_confirmed' then now() else import_confirmed_at end,
 import_error_at=case when p_action='import_error' then now() else import_error_at end
 where id=p_id and secret=p_secret and started_at>now()-interval '24 hours';
end $$;
revoke all on function public.record_usage(uuid,uuid,text,text,text) from public;
grant execute on function public.record_usage(uuid,uuid,text,text,text) to anon, authenticated;




create table public.screenings (
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<150000),
 revision text not null check(revision ~ '^[0-9a-f]{64}$'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index screenings_owner_updated on public.screenings(owner_id,updated_at desc);
alter table public.screenings enable row level security;
revoke all on public.screenings from public,anon,authenticated;
grant select,insert,update,delete on public.screenings to authenticated;
grant all on public.screenings to service_role;
create policy own_screenings on public.screenings for all to authenticated
 using (owner_id=(select auth.uid()))
 with check (owner_id=(select auth.uid()) and payload->>'emailConsent'='true'
 and lower(trim(payload->>'email'))=lower((select auth.jwt()->>'email')));

create table public.screening_deliveries (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 screening_id uuid not null, -- preserve delivery quota even when a screening is deleted
 revision text not null,
 status text not null default 'processing' check(status in ('processing','accepted','failed','unknown')),
 created_at timestamptz not null default now(),
 provider_id text,
 unique(owner_id,screening_id,revision)
);
alter table public.screening_deliveries enable row level security;
revoke all on public.screening_deliveries from public,anon,authenticated;
grant all on public.screening_deliveries to service_role;
create index screening_deliveries_created on public.screening_deliveries(created_at);
-- Only the verified Edge Function may reserve an email. Global lock serializes quota checks.
create function public.reserve_screening_delivery(p_owner uuid,p_screening uuid,p_revision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.screening_deliveries; job uuid;
begin
 perform pg_advisory_xact_lock(510051);
 if not exists(select 1 from public.screenings where id=p_screening and owner_id=p_owner and revision=p_revision)
 then return jsonb_build_object('status','stale'); end if;
 select * into existing from public.screening_deliveries where owner_id=p_owner and screening_id=p_screening and revision=p_revision;
 if found then return jsonb_build_object('status',existing.status,'id',existing.id); end if;
 if (select count(*) from public.screening_deliveries where owner_id=p_owner and created_at>now()-interval '24 hours')>=5
 or (select count(*) from public.screening_deliveries where created_at>now()-interval '24 hours')>=250
 then return jsonb_build_object('status','limited'); end if;
 insert into public.screening_deliveries(owner_id,screening_id,revision) values(p_owner,p_screening,p_revision) returning id into job;
 return jsonb_build_object('status','reserved','id',job);
end $$;
revoke all on function public.reserve_screening_delivery(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.reserve_screening_delivery(uuid,uuid,text) to service_role;
comment on table public.screenings is 'Screenings explicitly saved after verified email access; owner-only RLS. No source images.';
commit;
