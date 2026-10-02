begin;
-- Test identity only, rolled back together with every test write.
insert into auth.users(id,email) values('00000000-0000-4000-8000-00000000feed','voc-qa@example.invalid');
do $$
declare r jsonb; attempt uuid; uid uuid := '00000000-0000-4000-8000-00000000feed';
begin
 r := public.reserve_feedback_attempt(uid);
 assert r->>'status' = 'ok', 'initial reserve'; attempt := (r->>'id')::uuid;
 r := public.reserve_feedback_attempt(uid);
 assert r->>'status' = 'limited' and (r->>'retry_after')::int = 60, 'minute limit';
 perform public.release_feedback_attempt('00000000-0000-4000-8000-000000000bad',attempt);
 assert exists(select 1 from public.feedback_log where id=attempt), 'wrong owner cannot release';
 perform public.release_feedback_attempt(uid,attempt);
 r := public.reserve_feedback_attempt(uid);
 assert r->>'status' = 'ok', 'immediate retry after rejected delivery';
 perform public.release_feedback_attempt(uid,attempt);
 assert exists(select 1 from public.feedback_log where id=(r->>'id')::uuid), 'old release preserves new attempt';
 delete from public.feedback_log where owner_id=uid;
 insert into public.feedback_log(owner_id,created_at) select uid,now()-interval '2 hours' from generate_series(1,10);
 r:=public.reserve_feedback_attempt(uid);
 assert r->>'status' = 'limited' and (r->>'retry_after')::int > 60, 'daily quota accurate';
 assert not has_function_privilege('anon','public.reserve_feedback_attempt(uuid)','execute'), 'anon blocked';
 assert not has_function_privilege('authenticated','public.release_feedback_attempt(uuid,uuid)','execute'), 'user release blocked';
 assert has_function_privilege('service_role','public.reserve_feedback_attempt(uuid)','execute'), 'service permitted';
end $$;
select 'PASS: reservation, minute/day limits, retry, ownership, stale release, roles' as result;
rollback;
