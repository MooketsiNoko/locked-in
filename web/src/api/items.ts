import type { Item, ReminderRow } from '../../../shared/types'
import type { ItemPayload } from '../lib/itemForm'
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

export async function fetchItem(id: string): Promise<Item> {
  const { data, error } = await supabase.from('items').select('*').eq('id', id).single()
  if (error) throw error
  return data as Item
}

// Writes the item and its unsent reminder rows in one transaction (save_item RPC).
export async function saveItem(payload: ItemPayload, reminders: ReminderRow[]): Promise<string> {
  const { data, error } = await supabase.rpc('save_item', { item: payload, reminders })
  if (error) throw error
  return data as string
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}
