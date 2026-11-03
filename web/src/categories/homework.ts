import { z } from 'zod'
import { reminderSpecSchema, type FieldKey } from './common'

export const homeworkCategory = {
  label: 'Homework',
  singular: 'Homework',
  color: '#f97316',
  fields: ['due', 'reminders', 'notes'] as FieldKey[],
  detailsSchema: z.object({ reminders: z.array(reminderSpecSchema).optional() }),
}
