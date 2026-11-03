-- The send-reminders Edge Function connects as service_role, which (like authenticated, see 005)
-- gets no table access by default on migration-created tables. RLS is bypassed by this role.
grant select, insert, update, delete on
  public.items,
  public.reminders,
  public.push_subscriptions,
  public.user_settings
to service_role;
