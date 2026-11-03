-- One-time setup, run by hand in the SQL editor (not a migration: it holds a secret).
-- 1. Pick a long random string and store it. The same value goes in the function's CRON_SECRET secret.
select vault.create_secret('PASTE-A-LONG-RANDOM-STRING-HERE', 'cron_secret');

-- 2. Schedule the function every minute.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-reminders',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://xkgposoefygdtieijgot.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- To stop it:  select cron.unschedule('send-reminders');
-- To check it: select * from cron.job_run_details order by start_time desc limit 10;
