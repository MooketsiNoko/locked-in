import { z } from 'zod'
import { reminderSpecSchema, type FieldKey } from './common'

export const hangoutCategory = {
  label: 'Hangouts',
  singular: 'Hangout',
  color: '#22c55e',
  fields: ['starts', 'ends', 'location', 'people', 'reminders', 'notes'] as FieldKey[],
  detailsSchema: z.object({ people: z.array(z.string()).optional(), reminders: z.array(reminderSpecSchema).optional() }),
}
