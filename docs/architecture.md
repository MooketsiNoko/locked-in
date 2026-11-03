# Architecture

## Goals

- Schedule classes, homework, hangouts and side projects in one calendar.
- Per-category reminder behavior (see [reminders.md](reminders.md)).
- Usable on iPhone and Windows without a Mac or Apple developer account.
- Sync across the owner's devices; safe for friends to sign up and try.

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite + TypeScript, installable PWA | Same habits as the MVP repo (TanStack Query, screens/components/hooks split) |
| Data/auth | Supabase (Postgres, Auth, Realtime) | Row Level Security on every table. Email + password, plus Google sign-in |
| Scheduled work | `pg_cron` + Supabase Edge Function `send-reminders` | Runs every minute, sends Web Push |
| Push | Web Push (VAPID) | iOS 16.4+, only for PWAs added to the Home Screen |
| Offline | Service worker + persisted TanStack Query cache | Calendar opens without signal |
| Hosting | Vercel or Netlify (free tier) | Gives a shareable URL |
| Dates | `date-fns` + `date-fns-tz` | |
| Validation | `zod` | Per-category `details` schemas |

## Key decisions

1. **PWA, not native.** The owner uses iOS with a Windows PC, so native iOS builds are not possible without a Mac, and TestFlight needs a paid Apple account. A PWA installs from a link. If a Mac or dev account appears later, Capacitor can wrap the same code.
2. **One `items` table with a `category` column.** Categories differ by rules (fields, reminder defaults, color), not by storage. Each category is one file in `src/categories/` exporting its form fields, `details` schema and display info. Default reminder offsets come from the user's settings, not the category files.
3. **Server-side reminders.** iOS web apps cannot schedule local notifications while closed, so reminders are rows in a table and a cron job pushes them. This also gives multi-device delivery for free.
4. **Reminder logic is pure and shared.** `shared/rules.ts` turns an item plus settings into a list of fire times. The client calls it when saving; the Edge Function re-uses it when re-arming nudges.
5. **Multi-user from day one.** Every table has `user_id` and RLS, so friends can sign up without seeing each other's data. No admin features.
6. **Class occurrences are not stored.** A class is one row with a recurrence rule; occurrences are expanded client-side for the visible date range.
7. **Email + password, plus Google.** Magic links are avoided because on an iOS PWA the emailed link tends to open in Safari instead of the installed app. Google sign-in uses Supabase's Google provider with the full-page redirect flow (not a popup, which is unreliable in iOS standalone mode). Supabase links a Google login to an existing password account with the same verified email. Setup needs a free Google Cloud OAuth client. Test the redirect on a real iPhone alongside push.

## Repo layout

```
locked-in/
  README.md  CLAUDE.md
  package.json vite.config.ts tsconfig.json   one app at the repo root (Vite root is web/; tests run from here)
  .env.local                    VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (gitignored; see .env.example)
  docs/                         architecture, data-model, reminders, roadmap
  web/                          React PWA
    src/
      categories/               class.ts homework.ts hangout.ts project.ts (label, color, form fields, zod details schema), common.ts, index.ts
      recurrence/               expandWeekly.ts
      api/                      items.ts reminders.ts push.ts settings.ts
      hooks/                    useItems useMonth useProjects
      screens/
        calendar/               MonthScreen DayScreen
        agenda/                 upcoming list grouped by category
        item/                   ItemEditorScreen (form driven by category)
        projects/               ProjectsScreen + "log session"
        settings/               semester dates, default offsets, push toggle
      components/               cards/ common/ calendar/
      navigation/  theme/  types/  lib/ (supabase.ts, dates.ts, entries.ts)
    public/                     manifest.webmanifest service-worker.js icons/
  shared/                       rules.ts types.ts (imported by web and the function)
  supabase/
    migrations/                 001_items 002_reminders 003_push_subscriptions 004_user_settings
    functions/send-reminders/   cron-triggered, sends Web Push
  __tests__/                    rules.test.ts expandWeekly.test.ts
```

## Data flow

**Save an item:** form -> validate with the category's zod schema -> `shared/rules.ts` computes reminder rows -> one RPC `save_item(item, reminders[])` writes both in a transaction.

**Fire a reminder:** `pg_cron` (every minute) -> `send-reminders` -> `claim_due_reminders()` -> Web Push to each of the user's `push_subscriptions` -> mark `sent_at`.

**View the calendar:** query items overlapping the visible range -> expand class recurrences for that range -> render.

## Known risks

- **iOS web push reliability.** Requires Home Screen install and can be delayed. Prove it on a real iPhone early (roadmap step 4) before building on top of it.
- **Web Push library in Edge Functions.** The common `web-push` npm package may not run under Deno; verify, or use a Deno-compatible library.
- **Daylight saving.** Handled by storing class times as local wall time plus timezone (see [data-model.md](data-model.md)).
