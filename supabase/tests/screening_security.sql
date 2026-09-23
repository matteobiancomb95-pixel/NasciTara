-- Transactional synthetic tests. No production records are read; rollback removes fixtures.
begin;
select set_config('test.owner_a',gen_random_uuid()::text,true);
select set_config('test.owner_b',gen_random_uuid()::text,true);
select set_config('test.screening_a',gen_random_uuid()::text,true);
select set_config('test.screening_b',gen_random_uuid()::text,true);
insert into auth.users(id,email) values
(current_setting('test.owner_a')::uuid,'nascitara051-a@example.com'),
(current_setting('test.owner_b')::uuid,'nascitara051-b@example.com');
insert into public.screenings(id,owner_id,payload,revision) values
(current_setting('test.screening_a')::uuid,current_setting('test.owner_a')::uuid,'{"email":"nascitara051-a@example.com","emailConsent":true}',repeat('a',64)),
(current_setting('test.screening_b')::uuid,current_setting('test.owner_b')::uuid,'{"email":"nascitara051-b@example.com","emailConsent":true}',repeat('b',64));
select set_config('request.jwt.claims',json_build_object('sub',current_setting('test.owner_a'),'email','nascitara051-a@example.com','role','authenticated')::text,true);
set local role authenticated;
do $$ declare n integer; begin
 select count(*) into n from public.screenings where id in(current_setting('test.screening_a')::uuid,current_setting('test.screening_b')::uuid);
 if n<>1 then raise exception 'Owner isolation failed'; end if;
 update public.screenings set revision=repeat('c',64) where id=current_setting('test.screening_b')::uuid;
 get diagnostics n = row_count;
 if n<>0 then raise exception 'Cross-owner update allowed'; end if;
 begin
  insert into public.screenings(id,owner_id,payload,revision) values(gen_random_uuid(),current_setting('test.owner_b')::uuid,'{"email":"nascitara051-b@example.com","emailConsent":true}',repeat('a',64));
  raise exception 'Cross-owner insert allowed';
 exception when insufficient_privilege then null; end;
 begin
  perform public.reserve_screening_delivery(current_setting('test.owner_a')::uuid,current_setting('test.screening_a')::uuid,repeat('a',64));
  raise exception 'Public email reservation allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.screenings where id=current_setting('test.screening_a')::uuid;
 raise exception 'Anonymous clinical read allowed';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ declare result jsonb; sid uuid; i integer; begin
 result:=public.reserve_screening_delivery(current_setting('test.owner_a')::uuid,current_setting('test.screening_a')::uuid,repeat('a',64));
 if result->>'status'<>'reserved' then raise exception 'First reservation failed'; end if;
 result:=public.reserve_screening_delivery(current_setting('test.owner_a')::uuid,current_setting('test.screening_a')::uuid,repeat('a',64));
 if result->>'status'<>'processing' then raise exception 'Duplicate reservation allowed'; end if;
 result:=public.reserve_screening_delivery(current_setting('test.owner_a')::uuid,current_setting('test.screening_a')::uuid,repeat('c',64));
 if result->>'status'<>'stale' then raise exception 'Stale result allowed'; end if;
 for i in 2..6 loop
  sid:=gen_random_uuid();
  insert into public.screenings(id,owner_id,payload,revision) values(sid,current_setting('test.owner_a')::uuid,'{"email":"nascitara051-a@example.com","emailConsent":true}',repeat('a',64));
  result:=public.reserve_screening_delivery(current_setting('test.owner_a')::uuid,sid,repeat('a',64));
  if i=6 and result->>'status'<>'limited' then raise exception 'Per-user quota failed'; end if;
 end loop;
 delete from public.screenings where id=current_setting('test.screening_a')::uuid;
 if not exists(select 1 from public.screening_deliveries where screening_id=current_setting('test.screening_a')::uuid) then raise exception 'Deleting screening resets delivery quota'; end if;
end $$;
rollback;
select 'Owner isolation, anonymous denial, deduplication and delivery limits passed; fixtures rolled back' as result;
