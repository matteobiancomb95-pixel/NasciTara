begin;
drop function public.record_usage(uuid,uuid,text,text);
create or replace function public.record_usage(p_id uuid, p_secret uuid, p_action text, p_email text default null, p_release text default '0.4')
returns void language plpgsql security definer set search_path = '' as $$
declare stage integer;
begin
 if p_release not in ('0.4','0.5') then raise exception 'Invalid release'; end if;
 if p_id is null or p_secret is null or p_action is null or p_action not in
 ('start','identify','landing','pregnancy','measurements','dashboard','heartbeat','pdf_download','pdf_error','import_started','import_confirmed','import_error') then
  raise exception 'Invalid usage event';
 end if;
 if p_action = 'start' then
  insert into public.usage_sessions(id,secret,release) values(p_id,p_secret,p_release) on conflict(id) do nothing;
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


commit;
