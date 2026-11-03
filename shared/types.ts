export type Category = 'class' | 'homework' | 'hangout' | 'project'
export type Status = 'open' | 'done' | 'cancelled'

export type ReminderSpec =
  | { kind: 'before'; minutes: number }
  | { kind: 'day_at'; daysBefore: number; time: string }

export type Recurrence = {
  freq: 'weekly'
  byday: ('SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA')[]
  start_time: string
  duration_min: number
  tz: string
  from: string
  until: string
  exdates?: string[]
}

export type Item = {
  id: string
  category: Category
  title: string
  notes?: string | null
  location?: string | null
  status: Status
  starts_at: string | null
  ends_at: string | null
  due_at: string | null
  recurrence: Recurrence | null
  details: {
    reminders?: ReminderSpec[]
    room?: string
    instructor?: string
    people?: string[]
    last_worked_at?: string
    nudge_after_days?: number
  }
  created_at: string
}

export type Settings = {
  tz: string
  default_homework_reminders: ReminderSpec[]
  default_hangout_reminders: ReminderSpec[]
  default_nudge_days: number
}

export type ReminderRow = {
  kind: 'offset' | 'nudge'
  fire_at: string
  title: string
  body: string
}

export const DEFAULT_SETTINGS: Omit<Settings, 'tz'> = {
  default_homework_reminders: [
    { kind: 'day_at', daysBefore: 2, time: '15:00' },
    { kind: 'day_at', daysBefore: 1, time: '21:00' },
    { kind: 'day_at', daysBefore: 0, time: '15:00' },
  ],
  default_hangout_reminders: [{ kind: 'before', minutes: 120 }],
  default_nudge_days: 2,
}
