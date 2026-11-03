import { z } from 'zod'
import type { FieldKey } from './common'

export const classCategory = {
  label: 'Classes',
  singular: 'Class',
  color: '#3b82f6',
  fields: ['location', 'room', 'instructor', 'schedule', 'notes'] as FieldKey[],
  detailsSchema: z.object({ room: z.string().optional(), instructor: z.string().optional() }),
}
