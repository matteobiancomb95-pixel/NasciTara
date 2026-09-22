begin;
create table public.usage_sessions (
 id uuid primary key,
 secret uuid not null,
 email text check (email is null or length(email) <= 254),
 started_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 last_step text not null default 'landing' check(last_step in ('landing','pregnancy','measurements','dashboard')),
 max_stage integer not null default 0 check(max_stage between 0 and 3),
 reached_steps text[] not null default array['landing']::text[],
 completed_at timestamptz,
 pdf_downloaded_at timestamptz,
 pdf_error_at timestamptz,
 import_started_at timestamptz,
 import_confirmed_at timestamptz,
 import_error_at timestamptz,
 consent_version text not null default '0.4',
 release text not null default '0.4'
);
alter table public.usage_sessions enable row level security;
revoke all on public.usage_sessions from public, anon, authenticated;
grant select, delete on public.usage_sessions to service_role;
create index usage_sessions_started on public.usage_sessions(started_at);

create or replace function public.record_usage(p_id uuid, p_secret uuid, p_action text, p_email text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare stage integer;
begin
 if p_id is null or p_secret is null or p_action is null or p_action not in
 ('start','identify','landing','pregnancy','measurements','dashboard','heartbeat','pdf_download','pdf_error','import_started','import_confirmed','import_error') then
  raise exception 'Invalid usage event';
 end if;
 if p_action = 'start' then
  insert into public.usage_sessions(id,secret) values(p_id,p_secret) on conflict(id) do nothing;
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
revoke all on function public.record_usage(uuid,uuid,text,text) from public;
grant execute on function public.record_usage(uuid,uuid,text,text) to anon, authenticated;

create view public.usage_session_report as
select id,email,started_at,last_seen_at,last_step,
 (array['landing','pregnancy','measurements','dashboard'])[max_stage+1] as furthest_step,
 reached_steps,completed_at,pdf_downloaded_at,pdf_error_at,import_started_at,import_confirmed_at,import_error_at,
 case when completed_at is not null then 'completed'
      when last_seen_at < now()-interval '30 minutes' then 'inactive_30m'
      else 'active' end as status,
 release,consent_version
from public.usage_sessions;
revoke all on public.usage_session_report from public,anon,authenticated;
grant select on public.usage_session_report to service_role;

create view public.usage_funnel as
select (array['landing','pregnancy','measurements','dashboard'])[stage+1] as step,
 count(s.id) filter(where (array['landing','pregnancy','measurements','dashboard'])[stage+1]=any(s.reached_steps)) as sessions_reached,
 count(s.id) filter(where s.max_stage=stage and s.completed_at is null and s.last_seen_at<now()-interval '30 minutes') as inactive_at_stage
from generate_series(0,3) stage left join public.usage_sessions s on true group by stage order by stage;
revoke all on public.usage_funnel from public,anon,authenticated;
grant select on public.usage_funnel to service_role;

comment on view public.usage_session_report is 'Opt-in sessions, declared email (not verified). Inactivity after 30 minutes is an estimate, not a confirmed abandonment. No clinical data. Before consent, visits are not counted.';
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('nascitara-usage-retention','15 3 * * *',
 $$delete from public.usage_sessions where started_at < now() - interval '90 days'$$);
commit;
