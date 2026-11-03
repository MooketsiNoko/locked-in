create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  item_id uuid not null references public.items on delete cascade,
  kind text not null check (kind in ('offset', 'nudge')),
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index reminders_due_idx on public.reminders (fire_at) where sent_at is null;

alter table public.reminders enable row level security;

create policy "reminders_select_own" on public.reminders for select using (user_id = auth.uid());
create policy "reminders_insert_own" on public.reminders for insert with check (user_id = auth.uid());
create policy "reminders_update_own" on public.reminders for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reminders_delete_own" on public.reminders for delete using (user_id = auth.uid());
