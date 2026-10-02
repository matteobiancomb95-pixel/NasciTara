begin;
-- Identify each reservation so releasing one never removes a newer attempt.
alter table public.feedback_log add column id uuid not null default gen_random_uuid();
alter table public.feedback_log add constraint feedback_log_pkey primary key (id);

create function public.reserve_feedback_attempt(p_owner uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare last_at timestamptz; first_at timestamptz; used bigint; attempt uuid; wait_seconds integer := 0;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text, 17403));
 select max(created_at), min(created_at), count(*) into last_at, first_at, used
 from public.feedback_log where owner_id = p_owner and created_at > now() - interval '1 day';
 if last_at > now() - interval '1 minute' then
  wait_seconds := greatest(1, ceil(extract(epoch from last_at + interval '1 minute' - now()))::integer);
 end if;
 if used >= 10 then
  wait_seconds := greatest(wait_seconds, ceil(extract(epoch from first_at + interval '1 day' - now()))::integer);
 end if;
 if wait_seconds > 0 then return jsonb_build_object('status','limited','retry_after',wait_seconds); end if;
 insert into public.feedback_log(owner_id) values(p_owner) returning id into attempt;
 return jsonb_build_object('status','ok','id',attempt);
end $$;
create function public.release_feedback_attempt(p_owner uuid, p_attempt uuid) returns void
language sql security definer set search_path = '' as $$
 delete from public.feedback_log where owner_id = p_owner and id = p_attempt;
$$;
revoke all on function public.reserve_feedback_attempt(uuid) from public, anon, authenticated;
revoke all on function public.release_feedback_attempt(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_feedback_attempt(uuid) to service_role;
grant execute on function public.release_feedback_attempt(uuid,uuid) to service_role;
-- Keep older deployments compatible and serialize them on the same per-user lock.
create or replace function public.reserve_feedback(p_owner uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
 return (public.reserve_feedback_attempt(p_owner)->>'status') = 'ok';
end $$;
commit;
