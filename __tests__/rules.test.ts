import { describe, expect, it } from 'vitest'
import { computeReminders } from '../shared/rules'
import { DEFAULT_SETTINGS, type Item, type Settings } from '../shared/types'

const settings: Settings = { tz: 'America/New_York', ...DEFAULT_SETTINGS }
const now = new Date('2026-03-01T12:00:00Z')

const base: Item = {
  id: '1',
  category: 'homework',
  title: 'Essay',
  status: 'open',
  starts_at: null,
  ends_at: null,
  due_at: null,
  recurrence: null,
  details: {},
  created_at: '2026-02-20T00:00:00Z',
}
const hw = (over: Partial<Item> = {}): Item => ({ ...base, due_at: '2026-03-10T20:00:00Z', ...over })
const fires = (i: Item, n = now) => computeReminders(i, settings, n).map((r) => r.fire_at)

describe('computeReminders', () => {
  it('uses the three homework defaults', () => {
    // due 2026-03-10 16:00 EDT (UTC-4)
    expect(fires(hw())).toEqual([
      '2026-03-08T19:00:00.000Z', // 2 days before, 15:00
      '2026-03-10T01:00:00.000Z', // night before, 21:00
      '2026-03-10T19:00:00.000Z', // due day, 15:00
    ])
  })

  it('drops past times', () => {
    expect(fires(hw(), new Date('2026-03-09T12:00:00Z'))).toHaveLength(2)
  })

  it('drops times at/after the due time', () => {
    // due 10:00 local on the day: the 15:00 same-day reminder is dropped
    const item = hw({ due_at: '2026-03-10T14:00:00Z' }) // 10:00 EDT
    expect(fires(item)).toHaveLength(2)
  })

  it('computes day_at across daylight saving (US spring forward 2026-03-08)', () => {
    const item = hw({
      due_at: '2026-03-09T20:00:00Z', // 16:00 EDT
      details: { reminders: [{ kind: 'day_at', daysBefore: 2, time: '15:00' }] },
    })
    // Mar 7 15:00 is still EST (UTC-5)
    expect(fires(item)).toEqual(['2026-03-07T20:00:00.000Z'])
  })

  it('per-item override beats default', () => {
    const item = hw({ details: { reminders: [{ kind: 'before', minutes: 60 }] } })
    expect(fires(item)).toEqual(['2026-03-10T19:00:00.000Z'])
  })

  it('hangout uses the 2h default', () => {
    const item = { ...base, category: 'hangout' as const, due_at: null, starts_at: '2026-03-05T22:00:00Z' }
    expect(fires(item)).toEqual(['2026-03-05T20:00:00.000Z'])
  })

  it('class returns empty', () => {
    expect(fires({ ...base, category: 'class' })).toEqual([])
  })

  it('done and cancelled items return empty', () => {
    expect(fires(hw({ status: 'done' }))).toEqual([])
    expect(fires(hw({ status: 'cancelled' }))).toEqual([])
  })

  it('project nudge uses created_at when never worked on', () => {
    const item: Item = { ...base, category: 'project', created_at: '2026-03-01T00:00:00Z' }
    const rows = computeReminders(item, settings, now)
    expect(rows).toHaveLength(1)
    expect(rows[0].kind).toBe('nudge')
    expect(rows[0].fire_at).toBe('2026-03-03T00:00:00.000Z')
  })

  it('project nudge uses last_worked_at and nudge_after_days', () => {
    const item: Item = {
      ...base,
      category: 'project',
      details: { last_worked_at: '2026-03-01T10:00:00Z', nudge_after_days: 5 },
    }
    expect(fires(item)).toEqual(['2026-03-06T10:00:00.000Z'])
  })
})
