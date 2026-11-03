-- Supabase does not expose tables created by migrations to the API roles by default.
-- RLS policies (001-004) still decide which rows each user can touch.
grant select, insert, update, delete on
  public.items,
  public.reminders,
  public.push_subscriptions,
  public.user_settings
to authenticated;
