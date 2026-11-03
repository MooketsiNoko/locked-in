-- Atomically claims due reminders for the send-reminders Edge Function.
-- Claiming sets sent_at, so overlapping runs (skip locked) can never pick up the same row twice.
-- Service role only: it reads every user's reminders.
create function public.claim_due_reminders(p_limit int default 100) returns setof public.reminders
language sql security definer set search_path = public as $$
  update public.reminders set sent_at = now()
  where id in (
    select id from public.reminders
    where fire_at <= now() and sent_at is null
    order by fire_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

revoke execute on function public.claim_due_reminders(int) from public, anon, authenticated;
grant execute on function public.claim_due_reminders(int) to service_role;
