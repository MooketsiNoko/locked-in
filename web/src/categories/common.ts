import { z } from 'zod'

export type FieldKey =
  | 'location' | 'room' | 'instructor' | 'schedule' // class
  | 'due' // homework
  | 'starts' | 'ends' | 'people' // hangout
  | 'nudge' // project
  | 'reminders' | 'notes'

export const reminderSpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('before'), minutes: z.number().int().positive() }),
  z.object({ kind: z.literal('day_at'), daysBefore: z.number().int().min(0), time: z.string().regex(/^\d{2}:\d{2}$/) }),
])
