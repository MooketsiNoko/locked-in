import { fromZonedTime } from 'date-fns-tz'
import type { Recurrence } from '../../../shared/types'

export type Occurrence = { date: string; start: Date; end: Date }

const DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']

// Expands a weekly class recurrence into concrete occurrences overlapping [rangeStart, rangeEnd).
// Times are local wall time in rec.tz, so daylight saving never shifts a class.
export function expandWeekly(rec: Recurrence, rangeStart: Date, rangeEnd: Date): Occurrence[] {
  const out: Occurrence[] = []
  const exdates = new Set(rec.exdates ?? [])
  const last = Date.parse(`${rec.until}T00:00:00Z`)
  for (let t = Date.parse(`${rec.from}T00:00:00Z`); t <= last; t += 86_400_000) {
    const day = new Date(t)
    const date = day.toISOString().slice(0, 10)
    if (!rec.byday.includes(DAYS[day.getUTCDay()] as Recurrence['byday'][number])) continue
    if (exdates.has(date)) continue
    const start = fromZonedTime(`${date}T${rec.start_time}:00`, rec.tz)
    const end = new Date(start.getTime() + rec.duration_min * 60_000)
    if (start < rangeEnd && end > rangeStart) out.push({ date, start, end })
  }
  return out
}
