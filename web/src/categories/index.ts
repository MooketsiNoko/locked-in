import type { Category } from '../../../shared/types'
import { classCategory } from './class'
import { homeworkCategory } from './homework'
import { hangoutCategory } from './hangout'
import { projectCategory } from './project'

export const CATEGORIES = {
  class: classCategory,
  homework: homeworkCategory,
  hangout: hangoutCategory,
  project: projectCategory,
} satisfies Record<Category, unknown>
