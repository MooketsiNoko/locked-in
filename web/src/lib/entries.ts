import { formatInTimeZone } from 'date-fns-tz'
import type { Category, Item } from '../../../shared/types'
import { expandWeekly } from '../recurrence/expandWeekly'

// One thing to draw on the calendar: a class occurrence, a homework due time or a hangout.
export type Entry = {
  key: string
  itemId: string
  category: Category
  title: string
  date: string // local yyyy-MM-dd in the user's tz
  start: Date
  end: Date | null
}

export function buildEntries(items: Item[], rangeStart: Date, rangeEnd: Date, tz: string): Entry[] {
  const day = (d: Date) => formatInTimeZone(d, tz, 'yyyy-MM-dd')
  const out: Entry[] = []
  for (const item of items) {
    if (item.category === 'class' && item.recurrence) {
      for (const o of expandWeekly(item.recurrence, rangeStart, rangeEnd)) {
        out.push({ key: `${item.id}:${o.date}`, itemId: item.id, category: 'class', title: item.title, date: o.date, start: o.start, end: o.end })
      }
    } else if (item.category === 'homework' && item.due_at) {
      const start = new Date(item.due_at)
      if (start >= rangeStart && start < rangeEnd)
        out.push({ key: item.id, itemId: item.id, category: 'homework', title: item.title, date: day(start), start, end: null })
    } else if (item.category === 'hangout' && item.starts_at) {
      const start = new Date(item.starts_at)
      if (start >= rangeStart && start < rangeEnd)
        out.push({ key: item.id, itemId: item.id, category: 'hangout', title: item.title, date: day(start), start, end: item.ends_at ? new Date(item.ends_at) : null })
    }
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime())
}
