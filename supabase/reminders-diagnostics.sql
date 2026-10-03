-- Read-only: run in the SQL editor of the affected project. No keys, recipients or health details returned.
select jobname, schedule, active from cron.job where jobname = 'nascitara-reminders';
select name, length(decrypted_secret) > 0 as configured from vault.decrypted_secrets
where name in ('project_url', 'reminders_cron_secret');
select j.jobname, d.status, d.start_time, d.end_time from cron.job_run_details d
join cron.job j using(jobid) where j.jobname = 'nascitara-reminders' order by d.start_time desc limit 12;
-- A successful cron run only means an HTTP request was queued, not that the function or email succeeded.
select status_code, timed_out, created from net._http_response order by created desc limit 12;
select kind, status, count(*) from public.reminder_log where created_at > now() - interval '7 days' group by kind, status;
