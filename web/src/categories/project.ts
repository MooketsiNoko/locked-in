import { z } from 'zod'
import type { FieldKey } from './common'

export const projectCategory = {
  label: 'Side projects',
  singular: 'Side project',
  color: '#a855f7',
  fields: ['nudge', 'notes'] as FieldKey[],
  detailsSchema: z.object({
    last_worked_at: z.string().optional(),
    nudge_after_days: z.number().int().positive().optional(),
  }),
}
