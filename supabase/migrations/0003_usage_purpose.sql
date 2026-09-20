-- Email raccolte per conteggio utenti, non marketing.
alter table public.email_signups add column if not exists purpose text not null default 'usage_count' check (purpose = 'usage_count');
alter table public.email_signups add column if not exists notice_version text not null default '0.2';
comment on table public.email_signups is 'Conteggio utenti: solo email e consenso alla raccolta. Non marketing, nessun dato clinico.';
