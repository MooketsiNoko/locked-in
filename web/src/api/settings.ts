import type { Settings } from '../../../shared/types'
import { supabase } from '../lib/supabase'

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('user_settings').select('*').single()
  if (error) throw error
  return data as Settings
}
