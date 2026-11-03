import { describe, expect, it } from 'vitest'
import { emptyForm, formToPayload, itemToForm, payloadToItem } from '../web/src/lib/itemForm'

const tz = 'America/New_York'
const ok = (r: ReturnType<typeof formToPayload>) => {
  if (!r.ok) throw new Error(r.error)
  return r.payload
}

describe('formToPayload', () => {
  it('requires a title', () => {
    expect(formToPayload(emptyForm('homework', tz), tz)).toEqual({ ok: false, error: 'Title is required' })
  })

  it('converts homework due time from the user tz to UTC', () => {
    const f = { ...emptyForm('homework', tz), title: 'Essay', due: '2026-03-10T16:00' }
    const p = ok(formToPayload(f, tz))
    expect(p.due_at).toBe('2026-03-10T20:00:00.000Z') // EDT
    expect(p.details).toEqual({})
  })

  it('requires a due date for homework and a start for hangouts', () => {
    expect(formToPayload({ ...emptyForm('homework', tz), title: 'x' }, tz).ok).toBe(false)
    expect(formToPayload({ ...emptyForm('hangout', tz), title: 'x' }, tz).ok).toBe(false)
  })

  it('stores custom reminders only when enabled', () => {
    const base = { ...emptyForm('homework', tz), title: 'x', due: '2026-03-10T16:00' }
    const spec = [{ kind: 'before' as const, minutes: 60 }]
    expect(ok(formToPayload({ ...base, reminders: spec }, tz)).details.reminders).toBeUndefined()
    expect(ok(formToPayload({ ...base, customReminders: true, reminders: spec }, tz)).details.reminders).toEqual(spec)
  })

  it('rejects an invalid reminder spec through the zod schema', () => {
    const f = { ...emptyForm('homework', tz), title: 'x', due: '2026-03-10T16:00', customReminders: true, reminders: [{ kind: 'before' as const, minutes: -5 }] }
    expect(formToPayload(f, tz).ok).toBe(false)
  })

  it('parses hangout people and rejects end before start', () => {
    const f = { ...emptyForm('hangout', tz), title: 'Dinner', starts: '2026-03-10T19:00', people: 'Sam, Alex,' }
    expect(ok(formToPayload(f, tz)).details.people).toEqual(['Sam', 'Alex'])
    expect(formToPayload({ ...f, ends: '2026-03-10T18:00' }, tz).ok).toBe(false)
  })

  it('builds a class recurrence with the first occurrence as starts_at', () => {
    const f = {
      ...emptyForm('class', tz), title: 'DS', byday: ['MO' as const, 'WE' as const], startTime: '09:30',
      durationMin: '75', from: '2026-08-25', until: '2026-12-11', // from is a Tuesday
    }
    const p = ok(formToPayload(f, tz))
    expect(p.recurrence?.tz).toBe(tz)
    expect(p.starts_at).toBe('2026-08-26T13:30:00.000Z') // first Wednesday, 09:30 EDT
    expect(p.ends_at).toBe('2026-08-26T14:45:00.000Z')
  })

  it('validates class fields', () => {
    const f = { ...emptyForm('class', tz), title: 'DS', from: '2026-08-25', until: '2026-08-01' }
    expect(formToPayload(f, tz).ok).toBe(false) // no weekday
    expect(formToPayload({ ...f, byday: ['MO'] }, tz).ok).toBe(false) // until before from
  })

  it('rejects a non-positive nudge interval', () => {
    expect(formToPayload({ ...emptyForm('project', tz), title: 'x', nudgeAfterDays: '0' }, tz).ok).toBe(false)
  })
})

describe('itemToForm', () => {
  it('round-trips a homework item', () => {
    const f = { ...emptyForm('homework', tz), title: 'Essay', due: '2026-03-10T16:00', notes: 'draft', customReminders: true, reminders: [{ kind: 'before' as const, minutes: 30 }] }
    const p = ok(formToPayload(f, tz))
    const back = itemToForm(payloadToItem({ ...p, id: 'abc' }, '2026-03-01T00:00:00Z'), tz)
    expect(back).toMatchObject({ id: 'abc', title: 'Essay', due: '2026-03-10T16:00', notes: 'draft', customReminders: true, createdAt: '2026-03-01T00:00:00Z' })
    expect(ok(formToPayload(back, tz))).toEqual({ ...p, id: 'abc' })
  })

  it('preserves last_worked_at on projects', () => {
    const f = { ...emptyForm('project', tz), title: 'Site', lastWorkedAt: '2026-03-01T10:00:00Z', nudgeAfterDays: '4' }
    const p = ok(formToPayload(f, tz))
    expect(p.details).toEqual({ last_worked_at: '2026-03-01T10:00:00Z', nudge_after_days: 4 })
  })
})
