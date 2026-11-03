-- Sample data for the calendar views. Run once in the SQL editor (it bypasses RLS).
-- Attaches everything to the oldest user, with dates relative to today.
do $$
declare
  uid uuid := (select id from auth.users order by created_at limit 1);
  monday date := date_trunc('week', current_date - 28)::date;
begin
  insert into public.items (user_id, category, title, starts_at, ends_at, recurrence, details)
  values (
    uid, 'class', 'Data Structures',
    ((monday + time '09:30') at time zone 'America/New_York'),
    ((monday + time '10:45') at time zone 'America/New_York'),
    jsonb_build_object(
      'freq', 'weekly', 'byday', jsonb_build_array('MO', 'WE'),
      'start_time', '09:30', 'duration_min', 75, 'tz', 'America/New_York',
      'from', monday, 'until', monday + 120, 'exdates', jsonb_build_array()
    ),
    '{"room": "Hall 204"}'
  );

  insert into public.items (user_id, category, title, due_at)
  values
    (uid, 'homework', 'Problem set 4', (current_date + 3 + time '23:59') at time zone 'America/New_York'),
    (uid, 'homework', 'Essay draft', (current_date + 9 + time '17:00') at time zone 'America/New_York');

  insert into public.items (user_id, category, title, starts_at, ends_at)
  values (uid, 'hangout', 'Dinner with friends',
    (current_date + 5 + time '19:00') at time zone 'America/New_York',
    (current_date + 5 + time '21:00') at time zone 'America/New_York');

  insert into public.items (user_id, category, title)
  values (uid, 'project', 'Portfolio site');
end $$;
