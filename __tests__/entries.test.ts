import { describe, expect, it } from 'vitest'
import { buildEntries } from '../web/src/lib/entries'
import type { Item } from '../shared/types'

const base: Item = {
  id: 'x', category: 'homework', title: 'T', status: 'open', starts_at: null, ends_at: null,
  due_at: null, recurrence: null, details: {}, created_at: '2026-01-01T00:00:00Z',
}
const tz = 'America/New_York'
const from = new Date('2026-03-01T05:00:00Z')
const to = new Date('2026-04-01T04:00:00Z')

describe('buildEntries', () => {
  it('places homework on its local due date', () => {
    // 02:00Z on Mar 11 is still Mar 10 evening in New York
    const e = buildEntries([{ ...base, due_at: '2026-03-11T02:00:00Z' }], from, to, tz)
    expect(e.map((x) => x.date)).toEqual(['2026-03-10'])
  })

  it('omits dated items outside the range and projects entirely', () => {
    const items: Item[] = [
      { ...base, due_at: '2026-05-01T00:00:00Z' },
      { ...base, id: 'p', category: 'project' },
    ]
    expect(buildEntries(items, from, to, tz)).toEqual([])
  })

  it('expands classes and sorts by start', () => {
    const cls: Item = {
      ...base, id: 'c', category: 'class',
      recurrence: { freq: 'weekly', byday: ['MO'], start_time: '09:30', duration_min: 60, tz, from: '2026-03-01', until: '2026-03-31' },
    }
    const hw = { ...base, due_at: '2026-03-02T12:00:00Z' }
    const e = buildEntries([hw, cls], from, to, tz)
    expect(e.map((x) => x.category)).toEqual(['homework', 'class', 'class', 'class', 'class', 'class'])
  })
})
