begin;
create table public.account_welcome_deliveries (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 status text not null default 'processing' check (status in ('processing','accepted','failed','unknown')),
 created_at timestamptz not null default now(),
 provider_id text
);
alter table public.account_welcome_deliveries enable row level security;
revoke all on public.account_welcome_deliveries from public, anon, authenticated;
grant all on public.account_welcome_deliveries to service_role;
create function public.reserve_account_welcome(p_owner uuid)
returns text language plpgsql security definer set search_path='' as $$
declare previous text;
begin
 perform pg_advisory_xact_lock(510052);
 if not exists(select 1 from auth.users where id=p_owner and email_confirmed_at is not null
   and raw_user_meta_data->>'welcome_requested'='true' and coalesce(raw_user_meta_data->>'consent_version','')<>'')
 then return 'unauthorized'; end if;
 select status into previous from public.account_welcome_deliveries where owner_id=p_owner;
 if found then return previous; end if;
 if (select count(*) from public.account_welcome_deliveries where created_at>now()-interval '24 hours')>=50 then return 'limited'; end if;
 insert into public.account_welcome_deliveries(owner_id) values(p_owner);
 return 'reserved';
end $$;
revoke all on function public.reserve_account_welcome(uuid) from public,anon,authenticated;
grant execute on function public.reserve_account_welcome(uuid) to service_role;
commit;
