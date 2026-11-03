import { useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { CATEGORIES } from '../categories'
import { useItems } from '../hooks/useItems'
import { buildEntries, type Entry } from '../lib/entries'
import { addDays, startOfDay, todayIn, weekday } from '../lib/dates'

const MAX_CHIPS = 3
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function MonthScreen({ tz, onOpen }: { tz: string; onOpen: (itemId: string) => void }) {
  const today = todayIn(tz)
  const [first, setFirst] = useState(`${today.slice(0, 7)}-01`)

  const nextFirst = `${addDays(`${first.slice(0, 7)}-28`, 4).slice(0, 7)}-01`
  const prevFirst = `${addDays(first, -1).slice(0, 7)}-01`
  const gridStart = addDays(first, -weekday(first))
  const lastDay = addDays(nextFirst, -1)
  const gridEnd = addDays(lastDay, 6 - weekday(lastDay))
  const rangeStart = startOfDay(gridStart, tz)
  const rangeEnd = startOfDay(addDays(gridEnd, 1), tz)

  const { data: items, isLoading, error } = useItems(rangeStart, rangeEnd)
  const byDate = new Map<string, Entry[]>()
  for (const e of buildEntries(items ?? [], rangeStart, rangeEnd, tz)) {
    byDate.set(e.date, [...(byDate.get(e.date) ?? []), e])
  }

  const days: string[] = []
  for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) days.push(d)

  return (
    <section>
      <header className="month-head">
        <button onClick={() => setFirst(prevFirst)} aria-label="Previous month">‹</button>
        <strong>{formatInTimeZone(startOfDay(first, tz), tz, 'MMMM yyyy')}</strong>
        <button onClick={() => setFirst(nextFirst)} aria-label="Next month">›</button>
        <button onClick={() => setFirst(`${today.slice(0, 7)}-01`)}>Today</button>
      </header>
      {error && <p role="alert">{error.message}</p>}
      {isLoading && <p>Loading…</p>}
      <div className="grid">
        {DOW.map((d, i) => (
          <div key={i} className="dow">{d}</div>
        ))}
        {days.map((d) => {
          const entries = byDate.get(d) ?? []
          return (
            <div key={d} className={`cell${d.slice(0, 7) !== first.slice(0, 7) ? ' other' : ''}${d === today ? ' today' : ''}`}>
              <span className="num">{Number(d.slice(8))}</span>
              {entries.slice(0, MAX_CHIPS).map((e) => (
                <button key={e.key} className="chip" style={{ background: CATEGORIES[e.category].color }} title={e.title} onClick={() => onOpen(e.itemId)}>
                  {e.title}
                </button>
              ))}
              {entries.length > MAX_CHIPS && <div className="more">+{entries.length - MAX_CHIPS}</div>}
            </div>
          )
        })}
      </div>
    </section>
  )
}
