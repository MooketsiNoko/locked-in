# Reminders

## Rules per category

| Category | Reminder? | Fire times |
|---|---|---|
| Class | No | none |
| Homework | Yes | each `ReminderSpec` in `details.reminders`, else `user_settings.default_homework_reminders` (default: 2 days before at 15:00, night before at 21:00, due day at 15:00), relative to `due_at` |
| Hangout | Yes | each `ReminderSpec` in `details.reminders`, else `user_settings.default_hangout_reminders` (default: 2 hours before), relative to `starts_at` |
| Project | Nudge | `last_worked_at + nudge_after_days` (default 2; `created_at` if never worked on); re-armed after each send |

A spec is either `before` (N minutes earlier) or `day_at` (N days before, at a fixed local time; see [data-model.md](data-model.md)). `day_at` times use the user's `tz`. Fire times already in the past, or at/after the due or start time, are dropped (so a 15:00 reminder on a day when the work is due at 10:00 never fires). Done or cancelled items have no pending reminders.

## Pure rules (`shared/rules.ts`)

```ts
computeReminders(item, settings, now): ReminderRow[]
```

No I/O, no clock access beyond `now`, so it is fully unit-testable. Tests cover: past times dropped, times at/after the due time dropped, `day_at` correct across daylight saving, per-item override beats default, class returns empty, project nudge uses `created_at` when never worked on, done items return empty.

## Pipeline

1. **Save:** the client calls `computeReminders`, then the `save_item` RPC writes the item and replaces its unsent reminders in one transaction.
2. **Cron:** `pg_cron` calls the `send-reminders` Edge Function every minute (via `pg_net`).
3. **Claim:** the function calls `claim_due_reminders` (row-locking, so overlapping runs cannot double-send).
4. **Send:** for each reminder, Web Push to every `push_subscriptions` row of that user. Dead subscriptions (404/410) are deleted.
5. **Mark:** set `sent_at`. For `nudge` reminders, insert the next nudge at `now() + nudge_after_days`, so it keeps asking until the project is logged.
6. **Log a session:** `log_project_session` resets the nudge.

## Late and missed reminders

If a reminder is more than 60 minutes late (outage, cron gap), it is marked sent without pushing, except nudges, which are always sent. Stale "due in 2 hours" alerts are worse than none.

## Push on iOS

- The PWA must be added to the Home Screen; Safari tabs cannot receive push.
- Permission must be requested from a user gesture (a button in Settings), not on load.
- Delivery can lag. The settings screen shows whether this device is subscribed.
- Keep payloads small: `{ title, body, url }`. The service worker opens `url` on tap.
