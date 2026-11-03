# Locked In

A personal calendar/schedule app for classes, homework, hangouts and side projects. Each category has its own reminder behavior. Built as an installable PWA (works on iPhone via Add to Home Screen) on top of Supabase, so it syncs across devices and friends can try it. Sign in with email + password or Google.

| Category | Time shape | Reminders |
|---|---|---|
| Class | weekly recurrence within a semester | none |
| Homework | due date | custom reminders (default: 2 days before, night before, midday of due date) |
| Hangout | start time | custom reminders (default: 2 hours before) |
| Side project | no date | "have you worked on this?" nudge after N quiet days (default 2) |

## Setup

```
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev                  # app (also set VITE_VAPID_PUBLIC_KEY to try push)
npm test                     # shared/rules and expandWeekly tests
```

Apply `supabase/migrations/*.sql` in order (Supabase SQL editor or `supabase db push`). Optionally run `supabase/seed.sql` once for sample data.

## Deploy

Hosted on Vercel (free tier), deployed from GitHub: every push to `main` goes live and every PR gets a preview URL. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project settings, and add the site URL under Supabase Auth, URL Configuration. The app is an installable PWA (`web/public/manifest.webmanifest`, `service-worker.js`); on iPhone use Safari, Share, Add to Home Screen.

## Docs

Read these before changing anything structural.

- [docs/architecture.md](docs/architecture.md): stack, repo layout, key decisions
- [docs/data-model.md](docs/data-model.md): tables, RLS, recurrence and timezone rules
- [docs/reminders.md](docs/reminders.md): how reminder times are computed and pushed
- [docs/roadmap.md](docs/roadmap.md): build order and open questions

If a change contradicts a doc, update the doc in the same commit.
