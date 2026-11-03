# Locked In

Personal calendar PWA (React + Vite + TypeScript) on Supabase. See `README.md` and `docs/` for the design; they are the source of truth.

- Keep it simple: no extra abstractions, hardcode data where reasonable, minimal scripts.
- Reminder timing logic lives only in `shared/rules.ts` (pure, tested). Do not duplicate it in the app or the Edge Function.
- Every table has `user_id` and RLS. Never add a table without a policy.
- Times are stored as UTC `timestamptz`; class recurrence stores local wall time plus a timezone (see `docs/data-model.md`).
- Update the relevant doc in the same change when behavior or schema changes.
