import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatInTimeZone } from 'date-fns-tz'
import type { Item, ReminderSpec, Settings } from '../../../shared/types'
import { fetchItem } from '../api/items'
import { CATEGORIES } from '../categories'

type Props = { itemId: string; settings: Settings; onEdit: () => void; onBack: () => void }

const DAY_LABEL = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' }

const fmt = (iso: string, tz: string) => formatInTimeZone(iso, tz, 'EEE d MMM yyyy, h:mm a')

function describeReminder(r: ReminderSpec): string {
  if (r.kind === 'before') return r.minutes % 60 === 0 ? `${r.minutes / 60} h before` : `${r.minutes} min before`
  const when = r.daysBefore === 0 ? 'Day of' : `${r.daysBefore} day${r.daysBefore === 1 ? '' : 's'} before`
  return `${when} at ${r.time}`
}

export function ItemDetailScreen({ itemId, settings, onEdit, onBack }: Props) {
  const { data: item, error } = useQuery({ queryKey: ['item', itemId], queryFn: () => fetchItem(itemId) })
  if (error) return <p role="alert">{error.message}</p>
  if (!item) return <p>Loading…</p>

  const cat = CATEGORIES[item.category]
  const tz = settings.tz
  return (
    <article className="detail">
      <p style={{ color: cat.color, margin: 0 }}>{cat.singular}{item.status !== 'open' && ` (${item.status})`}</p>
      <h2>{item.title}</h2>
      <dl>
        {whenRows(item, settings)}
        {item.location && <Row label="Location">{item.location}</Row>}
        {item.details.room && <Row label="Room">{item.details.room}</Row>}
        {item.details.instructor && <Row label="Instructor">{item.details.instructor}</Row>}
        {item.details.people && item.details.people.length > 0 && <Row label="People">{item.details.people.join(', ')}</Row>}
        {reminderRow(item, settings)}
        {item.notes && <Row label="Notes">{item.notes}</Row>}
      </dl>
      <div className="actions">
        <button onClick={onEdit}>Edit</button>
        <button onClick={onBack}>Back</button>
      </div>
    </article>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </>
  )
}

function whenRows(item: Item, settings: Settings): ReactNode {
  const tz = settings.tz
  if (item.category === 'class' && item.recurrence) {
    const r = item.recurrence
    const start = new Date(`1970-01-01T${r.start_time}:00Z`)
    const end = new Date(start.getTime() + r.duration_min * 60_000)
    const t = (d: Date) => formatInTimeZone(d, 'UTC', 'h:mm a')
    return (
      <>
        <Row label="Repeats">{r.byday.map((d) => DAY_LABEL[d]).join(', ')}, {t(start)} to {t(end)}</Row>
        <Row label="Semester">{r.from} to {r.until}</Row>
        {r.exdates && r.exdates.length > 0 && <Row label="Skipped">{r.exdates.join(', ')}</Row>}
      </>
    )
  }
  if (item.category === 'homework' && item.due_at) return <Row label="Due">{fmt(item.due_at, tz)}</Row>
  if (item.category === 'hangout' && item.starts_at) {
    return (
      <>
        <Row label="Starts">{fmt(item.starts_at, tz)}</Row>
        {item.ends_at && <Row label="Ends">{fmt(item.ends_at, tz)}</Row>}
      </>
    )
  }
  if (item.category === 'project') {
    return (
      <>
        <Row label="Last worked on">{item.details.last_worked_at ? fmt(item.details.last_worked_at, tz) : 'Not yet'}</Row>
        <Row label="Nudge after">{item.details.nudge_after_days ?? settings.default_nudge_days} days quiet</Row>
      </>
    )
  }
  return null
}

function reminderRow(item: Item, settings: Settings): ReactNode {
  if (item.category !== 'homework' && item.category !== 'hangout') return null
  const custom = item.details.reminders
  const specs = custom ?? (item.category === 'homework' ? settings.default_homework_reminders : settings.default_hangout_reminders)
  return (
    <Row label={custom ? 'Reminders (custom)' : 'Reminders (your defaults)'}>
      {specs.length === 0 ? 'None' : specs.map(describeReminder).join('; ')}
    </Row>
  )
}
