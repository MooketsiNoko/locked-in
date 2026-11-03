import { useMemo } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import type { Category } from '../../../shared/types'
import { CATEGORIES } from '../categories'
import { useItems } from '../hooks/useItems'
import { buildEntries } from '../lib/entries'
import { addDays, startOfDay, todayIn } from '../lib/dates'

const DAYS_AHEAD = 30
const ORDER: Category[] = ['homework', 'hangout', 'class', 'project']

export function AgendaScreen({ tz }: { tz: string }) {
  const today = todayIn(tz)
  const { start, end } = useMemo(
    () => ({ start: startOfDay(today, tz), end: startOfDay(addDays(today, DAYS_AHEAD), tz) }),
    [today, tz],
  )
  const { data: items, isLoading, error } = useItems(start, end)
  const entries = buildEntries(items ?? [], start, end, tz)
  const projects = (items ?? []).filter((i) => i.category === 'project')

  return (
    <section>
      <h2>Next {DAYS_AHEAD} days</h2>
      {error && <p role="alert">{error.message}</p>}
      {isLoading && <p>Loading…</p>}
      {ORDER.map((cat) => {
        const rows =
          cat === 'project'
            ? projects.map((p) => ({ key: p.id, when: '', title: p.title }))
            : entries
                .filter((e) => e.category === cat)
                .map((e) => ({ key: e.key, when: formatInTimeZone(e.start, tz, 'EEE d MMM, h:mm a'), title: e.title }))
        return (
          <div key={cat} className="agenda-group">
            <h3 style={{ color: CATEGORIES[cat].color }}>{CATEGORIES[cat].label}</h3>
            {rows.length === 0 && <p className="empty">Nothing coming up</p>}
            <ul>
              {rows.map((r) => (
                <li key={r.key}>
                  {r.when && <span className="when">{r.when} </span>}
                  {r.title}
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
