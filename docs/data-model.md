# Data model

All tables live in Supabase Postgres. Every table has `user_id uuid references auth.users` and RLS policies of the form `user_id = auth.uid()` for select/insert/update/delete. No table ships without a policy.

## items

One row per thing on the calendar.

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | RLS |
| category | text | `class` \| `homework` \| `hangout` \| `project` (check constraint) |
| title | text | |
| notes | text null | |
| status | text | `open` \| `done` \| `cancelled`, default `open` |
| starts_at | timestamptz null | hangouts; first occurrence for classes |
| ends_at | timestamptz null | |
| due_at | timestamptz null | homework |
| all_day | bool | default false |
| location | text null | |
| recurrence | jsonb null | classes only, see below |
| course_id | uuid null | homework -> class item (optional link) |
| details | jsonb | category-specific fields, validated by the category's zod schema |
| created_at, updated_at | timestamptz | |

`details` by category:

- class: `{ room?, instructor? }`
- homework: `{ reminders?: ReminderSpec[] }` (relative to `due_at`; overrides the user default)
- hangout: `{ people?: string[], reminders?: ReminderSpec[] }` (relative to `starts_at`)
- project: `{ last_worked_at?: string, nudge_after_days?: number }`

### Recurrence (classes)

Stored as local wall time so daylight saving cannot shift a class:

```json
{
  "freq": "weekly",
  "byday": ["MO", "WE"],
  "start_time": "09:30",
  "duration_min": 75,
  "tz": "America/New_York",
  "from": "2026-08-24",
  "until": "2026-12-11",
  "exdates": ["2026-11-25"]
}
```

`expandWeekly(item, rangeStart, rangeEnd)` produces concrete occurrences in memory. Occurrences are never stored. Skipping a day means adding it to `exdates`.

## reminders

| Column | Type | Notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid | RLS |
| item_id | uuid | `on delete cascade` |
| kind | text | `offset` \| `nudge` |
| fire_at | timestamptz | |
| title, body | text | notification text, precomputed |
| sent_at | timestamptz null | set when pushed |
| created_at | timestamptz | |

Index: `(fire_at) where sent_at is null`. Editing an item deletes its unsent reminders and writes new ones in the same transaction (`save_item` RPC).

## push_subscriptions

One row per device. `id`, `user_id`, `endpoint` (unique), `p256dh`, `auth`, `user_agent`, `created_at`. Rows that return HTTP 404/410 from the push service are deleted by `send-reminders`.

## user_settings

One row per user. `user_id` pk, `tz`, `semester_start`, `semester_end`, `default_homework_reminders jsonb`, `default_hangout_reminders jsonb`, `default_nudge_days int` (default 2).

`ReminderSpec` is one of:

```ts
{ kind: 'before'; minutes: number }                 // 120 = 2 hours before
{ kind: 'day_at'; daysBefore: number; time: string } // local wall time, e.g. 2 days before at "15:00"
```

Defaults for a new user:

- homework: `[{day_at, 2, "15:00"}, {day_at, 1, "21:00"}, {day_at, 0, "15:00"}]` (2 days before, the night before, midday of the due date)
- hangout: `[{before, 120}]`
- nudge: 2 days

## RPCs

- `save_item(item jsonb, reminders jsonb[])`: upsert the item and replace its unsent reminders atomically.
- `log_project_session(item_id uuid)`: set `last_worked_at = now()` and replace the project's pending nudge with one at `now() + nudge_after_days`.
- `claim_due_reminders(limit int)`: `select ... for update skip locked` where `fire_at <= now() and sent_at is null`; used only by the Edge Function (service role).

## Time rules

- All instants are UTC `timestamptz`. Display converts to the user's `tz`.
- Recurrence uses local wall time + `tz`, so "9:30 every Monday" stays 9:30 across daylight saving.
- Reminder `fire_at` is computed as an absolute instant at save time.
