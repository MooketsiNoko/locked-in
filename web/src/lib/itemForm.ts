import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import type { Category, Item, Recurrence, ReminderSpec, Status } from '../../../shared/types'
import { CATEGORIES } from '../categories'
import { WEEKDAYS } from '../recurrence/expandWeekly'

// Flat, string-based form state. Converted to and from an Item with the user's timezone.
export type ItemForm = {
  id?: string
  category: Category
  status: Status
  createdAt?: string
  title: string
  notes: string
  location: string
  starts: string // yyyy-MM-ddTHH:mm in the user's tz
  ends: string
  due: string
  room: string
  instructor: string
  byday: Recurrence['byday']
  startTime: string
  durationMin: string
  from: string
  until: string
  exdates: string[]
  recTz: string
  people: string
  nudgeAfterDays: string
  lastWorkedAt: string
  customReminders: boolean
  reminders: ReminderSpec[]
}

// What save_item receives; created_at and reminder rows are handled separately.
export type ItemPayload = {
  id?: string
  category: Category
  title: string
  notes: string | null
  status: Status
  starts_at: string | null
  ends_at: string | null
  due_at: string | null
  location: string | null
  recurrence: Recurrence | null
  details: Item['details']
}

const INPUT_FMT = "yyyy-MM-dd'T'HH:mm"
const toInput = (iso: string | null | undefined, tz: string) => (iso ? formatInTimeZone(iso, tz, INPUT_FMT) : '')
const fromInput = (v: string, tz: string) => (v ? fromZonedTime(v, tz).toISOString() : null)

export function emptyForm(category: Category, tz: string): ItemForm {
  return {
    category, status: 'open', title: '', notes: '', location: '',
    starts: '', ends: '', due: '', room: '', instructor: '',
    byday: [], startTime: '09:00', durationMin: '60', from: '', until: '', exdates: [], recTz: tz,
    people: '', nudgeAfterDays: '', lastWorkedAt: '', customReminders: false, reminders: [],
  }
}

export function itemToForm(item: Item, tz: string): ItemForm {
  const form = emptyForm(item.category, tz)
  const d = item.details
  const rec = item.recurrence
  return {
    ...form,
    id: item.id,
    status: item.status,
    createdAt: item.created_at,
    title: item.title,
    notes: item.notes ?? '',
    location: item.location ?? '',
    starts: toInput(item.starts_at, tz),
    ends: toInput(item.ends_at, tz),
    due: toInput(item.due_at, tz),
    room: d.room ?? '',
    instructor: d.instructor ?? '',
    byday: rec?.byday ?? [],
    startTime: rec?.start_time ?? form.startTime,
    durationMin: rec ? String(rec.duration_min) : form.durationMin,
    from: rec?.from ?? '',
    until: rec?.until ?? '',
    exdates: rec?.exdates ?? [],
    recTz: rec?.tz ?? tz,
    people: (d.people ?? []).join(', '),
    nudgeAfterDays: d.nudge_after_days ? String(d.nudge_after_days) : '',
    lastWorkedAt: d.last_worked_at ?? '',
    customReminders: d.reminders !== undefined,
    reminders: d.reminders ?? [],
  }
}

const blank = (s: string) => s.trim() || undefined

export function formToPayload(f: ItemForm, tz: string): { ok: true; payload: ItemPayload } | { ok: false; error: string } {
  const fail = (error: string) => ({ ok: false as const, error })
  if (!f.title.trim()) return fail('Title is required')

  let starts_at: string | null = null
  let ends_at: string | null = null
  let due_at: string | null = null
  let recurrence: Recurrence | null = null
  const rawDetails: Record<string, unknown> = {}

  if (f.category === 'class') {
    const duration = Number(f.durationMin)
    if (f.byday.length === 0) return fail('Pick at least one weekday')
    if (!/^\d{2}:\d{2}$/.test(f.startTime)) return fail('Start time is required')
    if (!Number.isInteger(duration) || duration <= 0) return fail('Duration must be a positive number of minutes')
    if (!f.from || !f.until) return fail('From and until dates are required')
    if (f.until < f.from) return fail('Until must be on or after from')
    recurrence = {
      freq: 'weekly', byday: f.byday, start_time: f.startTime, duration_min: duration,
      tz: f.recTz, from: f.from, until: f.until, exdates: f.exdates,
    }
    // starts_at/ends_at hold the first occurrence
    for (let i = 0; i < 7 && !starts_at; i++) {
      const day = new Date(`${f.from}T00:00:00Z`)
      day.setUTCDate(day.getUTCDate() + i)
      if (f.byday.includes(WEEKDAYS[day.getUTCDay()])) {
        starts_at = fromZonedTime(`${day.toISOString().slice(0, 10)}T${f.startTime}:00`, f.recTz).toISOString()
      }
    }
    if (!starts_at) return fail('No class day falls on or after the from date')
    ends_at = new Date(new Date(starts_at).getTime() + duration * 60_000).toISOString()
    rawDetails.room = blank(f.room)
    rawDetails.instructor = blank(f.instructor)
  } else if (f.category === 'homework') {
    due_at = fromInput(f.due, tz)
    if (!due_at) return fail('Due date is required')
  } else if (f.category === 'hangout') {
    starts_at = fromInput(f.starts, tz)
    ends_at = fromInput(f.ends, tz)
    if (!starts_at) return fail('Start time is required')
    if (ends_at && ends_at <= starts_at) return fail('End must be after start')
    const people = f.people.split(',').map((p) => p.trim()).filter(Boolean)
    if (people.length) rawDetails.people = people
  } else {
    const days = f.nudgeAfterDays.trim() ? Number(f.nudgeAfterDays) : undefined
    rawDetails.nudge_after_days = days
    rawDetails.last_worked_at = blank(f.lastWorkedAt)
  }

  if (f.customReminders && (f.category === 'homework' || f.category === 'hangout')) {
    rawDetails.reminders = f.reminders
  }

  const parsed = CATEGORIES[f.category].detailsSchema.safeParse(rawDetails)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  return {
    ok: true,
    payload: {
      id: f.id, category: f.category, title: f.title.trim(), notes: blank(f.notes) ?? null, status: f.status,
      starts_at, ends_at, due_at, location: f.category === 'class' || f.category === 'hangout' ? (blank(f.location) ?? null) : null,
      recurrence, details: parsed.data as Item['details'],
    },
  }
}

// computeReminders needs a full Item; new items are "created" now.
export function payloadToItem(p: ItemPayload, createdAt: string | undefined): Item {
  return { ...p, id: p.id ?? 'new', created_at: createdAt ?? new Date().toISOString() }
}
