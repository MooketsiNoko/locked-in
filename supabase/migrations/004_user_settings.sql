create table public.user_settings (
  user_id uuid primary key references auth.users on delete cascade default auth.uid(),
  tz text not null default 'America/New_York',
  semester_start date,
  semester_end date,
  default_homework_reminders jsonb not null default '[
    {"kind": "day_at", "daysBefore": 2, "time": "15:00"},
    {"kind": "day_at", "daysBefore": 1, "time": "21:00"},
    {"kind": "day_at", "daysBefore": 0, "time": "15:00"}
  ]',
  default_hangout_reminders jsonb not null default '[{"kind": "before", "minutes": 120}]',
  default_nudge_days int not null default 2
);

alter table public.user_settings enable row level security;

create policy "settings_select_own" on public.user_settings for select using (user_id = auth.uid());
create policy "settings_insert_own" on public.user_settings for insert with check (user_id = auth.uid());
create policy "settings_update_own" on public.user_settings for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "settings_delete_own" on public.user_settings for delete using (user_id = auth.uid());

-- Every new user gets a settings row with the defaults above.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
