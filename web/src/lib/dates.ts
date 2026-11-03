import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'

// Calendar-date helpers on 'yyyy-MM-dd' strings, so no timezone or DST math is involved.
export const addDays = (date: string, n: number): string => {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export const weekday = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay()

export const todayIn = (tz: string): string => formatInTimeZone(new Date(), tz, 'yyyy-MM-dd')

export const startOfDay = (date: string, tz: string): Date => fromZonedTime(`${date}T00:00:00`, tz)
