import type { Category } from '../../../shared/types'

export const CATEGORIES: Record<Category, { label: string; color: string }> = {
  class: { label: 'Classes', color: '#3b82f6' },
  homework: { label: 'Homework', color: '#f97316' },
  hangout: { label: 'Hangouts', color: '#22c55e' },
  project: { label: 'Side projects', color: '#a855f7' },
}
