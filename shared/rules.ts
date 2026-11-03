import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Item, ReminderRow, ReminderSpec, Settings } from './types.ts'

const DAY_MS = 86_400_000
const NUDGE_BODY = 'Have you worked on this lately?'

// Absolute instant for `daysBefore` calendar days before `base`, at local wall time `time` in `tz`.
function dayAt(base: Date, spec: { daysBefore: number; time: string }, tz: string): Date {
  const [y, m, d] = formatInTimeZone(base, tz, 'yyyy-MM-dd').split('-').map(Number)
  const day = new Date(Date.UTC(y, m - 1, d - spec.daysBefore)).toISOString().slice(0, 10)
  return fromZonedTime(`${day}T${spec.time}:00`, tz)
}

function fireTime(base: Date, spec: ReminderSpec, tz: string): Date {
  return spec.kind === 'before' ? new Date(base.getTime() - spec.minutes * 60_000) : dayAt(base, spec, tz)
}

export function computeReminders(item: Item, settings: Settings, now: Date): ReminderRow[] {
  if (item.status !== 'open') return []

  if (item.category === 'project') {
    const days = item.details.nudge_after_days ?? settings.default_nudge_days
    const last = new Date(item.details.last_worked_at ?? item.created_at)
    // An overdue nudge fires as soon as possible rather than being dropped.
    const fire = new Date(Math.max(last.getTime() + days * DAY_MS, now.getTime()))
    return [
      {
        kind: 'nudge',
        fire_at: fire.toISOString(),
        title: item.title,
        body: NUDGE_BODY,
      },
    ]
  }

  if (item.category !== 'homework' && item.category !== 'hangout') return []

  const baseStr = item.category === 'homework' ? item.due_at : item.starts_at
  if (!baseStr) return []
  const base = new Date(baseStr)
  const specs =
    item.details.reminders ??
    (item.category === 'homework' ? settings.default_homework_reminders : settings.default_hangout_reminders)

  const when = formatInTimeZone(base, settings.tz, 'EEE d MMM, h:mm a')
  const title = item.category === 'homework' ? `Homework due: ${item.title}` : item.title
  const body = item.category === 'homework' ? `Due ${when}` : `Starts ${when}`

  return specs
    .map((spec) => fireTime(base, spec, settings.tz))
    .filter((fire) => fire > now && fire < base)
    .sort((a, b) => a.getTime() - b.getTime())
    .map((fire) => ({ kind: 'offset' as const, fire_at: fire.toISOString(), title, body }))
}

// After a nudge is sent, the next one is due a full interval later, until the project is logged.
export function nextNudge(item: Item, settings: Pick<Settings, 'default_nudge_days'>, sentAt: Date): ReminderRow {
  const days = item.details.nudge_after_days ?? settings.default_nudge_days
  return {
    kind: 'nudge',
    fire_at: new Date(sentAt.getTime() + days * DAY_MS).toISOString(),
    title: item.title,
    body: NUDGE_BODY,
  }
}
