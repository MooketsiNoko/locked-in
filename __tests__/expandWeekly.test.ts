import { describe, expect, it } from 'vitest'
import { expandWeekly } from '../web/src/recurrence/expandWeekly'
import type { Recurrence } from '../shared/types'

const rec: Recurrence = {
  freq: 'weekly',
  byday: ['MO', 'WE'],
  start_time: '09:30',
  duration_min: 75,
  tz: 'America/New_York',
  from: '2026-08-24',
  until: '2026-12-11',
  exdates: ['2026-11-25'],
}
const range = (a: string, b: string) => expandWeekly(rec, new Date(a), new Date(b))

describe('expandWeekly', () => {
  it('returns matching weekdays in range', () => {
    const occ = range('2026-08-24T00:00:00Z', '2026-09-01T00:00:00Z')
    expect(occ.map((o) => o.date)).toEqual(['2026-08-24', '2026-08-26', '2026-08-31'])
  })

  it('computes duration', () => {
    const [o] = range('2026-08-24T00:00:00Z', '2026-08-25T00:00:00Z')
    expect(o.end.getTime() - o.start.getTime()).toBe(75 * 60_000)
  })

  it('keeps 9:30 local across the fall-back DST change (2026-11-01)', () => {
    const occ = range('2026-10-26T00:00:00Z', '2026-11-05T00:00:00Z')
    const byDate = Object.fromEntries(occ.map((o) => [o.date, o.start.toISOString()]))
    expect(byDate['2026-10-26']).toBe('2026-10-26T13:30:00.000Z') // EDT
    expect(byDate['2026-11-02']).toBe('2026-11-02T14:30:00.000Z') // EST
  })

  it('skips exdates', () => {
    const occ = range('2026-11-23T00:00:00Z', '2026-11-28T00:00:00Z')
    expect(occ.map((o) => o.date)).toEqual(['2026-11-23'])
  })

  it('respects from and until', () => {
    expect(range('2026-08-01T00:00:00Z', '2026-08-23T00:00:00Z')).toEqual([])
    expect(range('2026-12-12T00:00:00Z', '2027-01-30T00:00:00Z')).toEqual([])
    expect(range('2026-12-01T00:00:00Z', '2027-01-30T00:00:00Z').at(-1)?.date).toBe('2026-12-09')
  })
})
