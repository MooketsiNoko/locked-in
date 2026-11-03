-- Upserts an item and replaces its unsent reminders in one transaction.
-- security invoker: RLS applies, and user_id always comes from auth.uid(), never from the payload.
-- reminders is a JSON array of {kind, fire_at, title, body}.
create function public.save_item(item jsonb, reminders jsonb) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid := coalesce((item->>'id')::uuid, gen_random_uuid());
begin
  insert into public.items (
    id, user_id, category, title, notes, status,
    starts_at, ends_at, due_at, location, recurrence, details
  ) values (
    v_id, auth.uid(), item->>'category', item->>'title', item->>'notes',
    coalesce(item->>'status', 'open'),
    (item->>'starts_at')::timestamptz, (item->>'ends_at')::timestamptz, (item->>'due_at')::timestamptz,
    item->>'location', nullif(item->'recurrence', 'null'::jsonb), coalesce(item->'details', '{}')
  )
  on conflict (id) do update set
    category = excluded.category, title = excluded.title, notes = excluded.notes, status = excluded.status,
    starts_at = excluded.starts_at, ends_at = excluded.ends_at, due_at = excluded.due_at,
    location = excluded.location, recurrence = excluded.recurrence, details = excluded.details;

  delete from public.reminders where item_id = v_id and sent_at is null;

  insert into public.reminders (user_id, item_id, kind, fire_at, title, body)
  select auth.uid(), v_id, r->>'kind', (r->>'fire_at')::timestamptz, r->>'title', r->>'body'
  from jsonb_array_elements(coalesce(reminders, '[]'::jsonb)) as r;

  return v_id;
end $$;

revoke execute on function public.save_item(jsonb, jsonb) from public, anon;
grant execute on function public.save_item(jsonb, jsonb) to authenticated;
