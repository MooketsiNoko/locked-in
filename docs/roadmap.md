# Roadmap

Check items off as they land.

## Build order

1. [ ] **Foundation:** repo scaffold (Vite PWA), Supabase project, migrations with RLS, auth (email + password; Google sign-in added once password login works), `shared/rules.ts` + `expandWeekly` with tests.
2. [ ] **Calendar views:** month and agenda showing all four categories, color-coded.
3. [ ] **Editing:** item editor driven by the category; `save_item` RPC writes reminder rows.
4. [ ] **Push (riskiest, do early):** manifest, service worker, install on a real iPhone, subscribe, `send-reminders` + `pg_cron`. Also confirm Google sign-in redirects back into the installed app. Confirm a reminder arrives with the app closed before building more.
5. [ ] **Projects and settings:** project list with "log session", nudge re-arming, semester dates and default offsets.
6. [ ] **Friend trial:** deploy, invite a few people, collect feedback.

## Later / maybe

- Google Calendar import or export
- Capacitor wrap if a Mac or Apple developer account becomes available
- Homework linked to its class, with due dates shown on the class
- Email fallback if iOS push proves unreliable
- More categories (exams, shifts, etc.) once real use suggests them

## Open questions

- Month grid: build our own or use a library? Default to our own simple grid first.
- gamesense repo: not found under the EBOD13 GitHub account; if it has a structure worth borrowing, add its URL here.
