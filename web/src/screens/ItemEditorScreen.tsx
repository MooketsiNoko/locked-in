import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { computeReminders } from '../../../shared/rules'
import type { Category, ReminderSpec, Settings, Status } from '../../../shared/types'
import { deleteItem, fetchItem, saveItem } from '../api/items'
import { CATEGORIES } from '../categories'
import type { FieldKey } from '../categories/common'
import { emptyForm, formToPayload, itemToForm, payloadToItem, type ItemForm } from '../lib/itemForm'
import { WEEKDAYS } from '../recurrence/expandWeekly'

const DAY_LABEL = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' }

type Props = { itemId?: string; category?: Category; settings: Settings; onClose: () => void; onDeleted: () => void }

export function ItemEditorScreen({ itemId, category, settings, onClose, onDeleted }: Props) {
  const { data: item, error } = useQuery({
    queryKey: ['item', itemId],
    queryFn: () => fetchItem(itemId!),
    enabled: !!itemId,
  })
  if (itemId && error) return <p role="alert">{error.message}</p>
  if (itemId && !item) return <p>Loading…</p>
  const initial = item ? itemToForm(item, settings.tz) : emptyForm(category!, settings.tz)
  return <EditorForm initial={initial} settings={settings} onClose={onClose} onDeleted={onDeleted} />
}

function EditorForm({ initial, settings, onClose, onDeleted }: { initial: ItemForm; settings: Settings; onClose: () => void; onDeleted: () => void }) {
  const [form, setForm] = useState(initial)
  const [message, setMessage] = useState('')
  const queryClient = useQueryClient()
  const cat = CATEGORIES[form.category]
  const set = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => setForm((f) => ({ ...f, [key]: value }))

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['items'] })
    queryClient.invalidateQueries({ queryKey: ['item'] })
  }

  const save = useMutation({
    mutationFn: async (status: Status) => {
      const result = formToPayload({ ...form, status }, settings.tz)
      if (!result.ok) throw new Error(result.error)
      const reminders = computeReminders(payloadToItem(result.payload, form.createdAt), settings, new Date())
      await saveItem(result.payload, reminders)
    },
    onSuccess: () => { refresh(); onClose() },
    onError: (e: Error) => setMessage(e.message),
  })

  const remove = useMutation({
    mutationFn: () => deleteItem(form.id!),
    onSuccess: () => { refresh(); onDeleted() },
    onError: (e: Error) => setMessage(e.message),
  })

  const busy = save.isPending || remove.isPending

  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault()
        setMessage('')
        save.mutate(form.status)
      }}
    >
      <h2>{form.id ? 'Edit' : 'New'} {cat.singular.toLowerCase()}</h2>
      <Field label="Title">
        <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>
      {cat.fields.map((key) => (
        <FieldInput key={key} name={key} form={form} set={set} settings={settings} />
      ))}
      {message && <p role="alert">{message}</p>}
      <div className="actions">
        <button disabled={busy}>Save</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
      {form.id && (
        <div className="actions">
          {form.status === 'open' ? (
            <>
              <button type="button" disabled={busy} onClick={() => save.mutate('done')}>Mark done</button>
              <button type="button" disabled={busy} onClick={() => save.mutate('cancelled')}>Cancel item</button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => save.mutate('open')}>Reopen ({form.status})</button>
          )}
          <button type="button" disabled={busy} onClick={() => confirm('Delete this item?') && remove.mutate()}>Delete</button>
        </div>
      )}
    </form>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

type SetFn = <K extends keyof ItemForm>(key: K, value: ItemForm[K]) => void

function FieldInput({ name, form, set, settings }: { name: FieldKey; form: ItemForm; set: SetFn; settings: Settings }) {
  switch (name) {
    case 'notes':
      return <Field label="Notes"><textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
    case 'location':
      return <Field label="Location"><input value={form.location} onChange={(e) => set('location', e.target.value)} /></Field>
    case 'room':
      return <Field label="Room"><input value={form.room} onChange={(e) => set('room', e.target.value)} /></Field>
    case 'instructor':
      return <Field label="Instructor"><input value={form.instructor} onChange={(e) => set('instructor', e.target.value)} /></Field>
    case 'due':
      return <Field label="Due"><input type="datetime-local" value={form.due} onChange={(e) => set('due', e.target.value)} required /></Field>
    case 'starts':
      return <Field label="Starts"><input type="datetime-local" value={form.starts} onChange={(e) => set('starts', e.target.value)} required /></Field>
    case 'ends':
      return <Field label="Ends (optional)"><input type="datetime-local" value={form.ends} onChange={(e) => set('ends', e.target.value)} /></Field>
    case 'people':
      return <Field label="People (comma separated)"><input value={form.people} onChange={(e) => set('people', e.target.value)} /></Field>
    case 'nudge':
      return (
        <Field label={`Nudge after days quiet (default ${settings.default_nudge_days})`}>
          <input type="number" min={1} value={form.nudgeAfterDays} onChange={(e) => set('nudgeAfterDays', e.target.value)} />
        </Field>
      )
    case 'schedule':
      return <Schedule form={form} set={set} />
    case 'reminders':
      return <Reminders form={form} set={set} settings={settings} />
  }
}

function Schedule({ form, set }: { form: ItemForm; set: SetFn }) {
  const [skip, setSkip] = useState('')
  return (
    <fieldset>
      <legend>Schedule (weekly, {form.recTz})</legend>
      <div className="days">
        {WEEKDAYS.map((d) => (
          <label key={d}>
            <input
              type="checkbox"
              checked={form.byday.includes(d)}
              onChange={(e) => set('byday', e.target.checked ? [...form.byday, d] : form.byday.filter((x) => x !== d))}
            />
            {DAY_LABEL[d]}
          </label>
        ))}
      </div>
      <Field label="Start time"><input type="time" value={form.startTime} onChange={(e) => set('startTime', e.target.value)} required /></Field>
      <Field label="Duration (minutes)"><input type="number" min={1} value={form.durationMin} onChange={(e) => set('durationMin', e.target.value)} required /></Field>
      <Field label="From"><input type="date" value={form.from} onChange={(e) => set('from', e.target.value)} required /></Field>
      <Field label="Until"><input type="date" value={form.until} onChange={(e) => set('until', e.target.value)} required /></Field>
      <Field label="Skip a date">
        <span className="row">
          <input type="date" value={skip} onChange={(e) => setSkip(e.target.value)} />
          <button
            type="button"
            disabled={!skip || form.exdates.includes(skip)}
            onClick={() => { set('exdates', [...form.exdates, skip].sort()); setSkip('') }}
          >
            Skip
          </button>
        </span>
      </Field>
      {form.exdates.map((d) => (
        <span key={d} className="tag">
          {d} <button type="button" aria-label={`Remove ${d}`} onClick={() => set('exdates', form.exdates.filter((x) => x !== d))}>x</button>
        </span>
      ))}
    </fieldset>
  )
}

function Reminders({ form, set, settings }: { form: ItemForm; set: SetFn; settings: Settings }) {
  const defaults = form.category === 'homework' ? settings.default_homework_reminders : settings.default_hangout_reminders
  const update = (i: number, spec: ReminderSpec) => set('reminders', form.reminders.map((r, j) => (j === i ? spec : r)))
  return (
    <fieldset>
      <legend>Reminders</legend>
      <label>
        <input
          type="checkbox"
          checked={form.customReminders}
          onChange={(e) => {
            set('customReminders', e.target.checked)
            if (e.target.checked && form.reminders.length === 0) set('reminders', defaults)
          }}
        />
        Custom reminders for this item (otherwise your defaults)
      </label>
      {form.customReminders && (
        <>
          {form.reminders.map((r, i) => (
            <div key={i} className="row">
              <select
                value={r.kind}
                onChange={(e) => update(i, e.target.value === 'before' ? { kind: 'before', minutes: 60 } : { kind: 'day_at', daysBefore: 1, time: '21:00' })}
              >
                <option value="before">Before</option>
                <option value="day_at">Day at</option>
              </select>
              {r.kind === 'before' ? (
                <>
                  <input type="number" min={1} value={r.minutes} onChange={(e) => update(i, { ...r, minutes: Number(e.target.value) })} />
                  <span>minutes before</span>
                </>
              ) : (
                <>
                  <input type="number" min={0} value={r.daysBefore} onChange={(e) => update(i, { ...r, daysBefore: Number(e.target.value) })} />
                  <span>days before at</span>
                  <input type="time" value={r.time} onChange={(e) => update(i, { ...r, time: e.target.value })} />
                </>
              )}
              <button type="button" aria-label="Remove reminder" onClick={() => set('reminders', form.reminders.filter((_, j) => j !== i))}>x</button>
            </div>
          ))}
          <button type="button" onClick={() => set('reminders', [...form.reminders, { kind: 'before', minutes: 60 }])}>Add reminder</button>
        </>
      )}
    </fieldset>
  )
}
