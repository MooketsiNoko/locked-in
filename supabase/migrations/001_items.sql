create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  category text not null check (category in ('class', 'homework', 'hangout', 'project')),
  title text not null,
  notes text,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  due_at timestamptz,
  all_day boolean not null default false,
  location text,
  recurrence jsonb,
  course_id uuid references public.items on delete set null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_user_starts_idx on public.items (user_id, starts_at);
create index items_user_due_idx on public.items (user_id, due_at);

create function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger items_updated_at before update on public.items
  for each row execute function public.set_updated_at();

alter table public.items enable row level security;

create policy "items_select_own" on public.items for select using (user_id = auth.uid());
create policy "items_insert_own" on public.items for insert with check (user_id = auth.uid());
create policy "items_update_own" on public.items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "items_delete_own" on public.items for delete using (user_id = auth.uid());
