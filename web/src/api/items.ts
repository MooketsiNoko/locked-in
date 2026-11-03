import type { Item } from '../../../shared/types'
import { supabase } from '../lib/supabase'

// Classes and projects are always fetched (classes expand client-side, projects have no date);
// homework and hangouts only when they fall inside [start, end).
export async function fetchItems(start: Date, end: Date): Promise<Item[]> {
  const s = start.toISOString()
  const e = end.toISOString()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .neq('status', 'cancelled')
    .or(`category.in.(class,project),and(due_at.gte.${s},due_at.lt.${e}),and(starts_at.gte.${s},starts_at.lt.${e})`)
  if (error) throw error
  return data as Item[]
}
