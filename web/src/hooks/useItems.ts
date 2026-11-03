import { useQuery } from '@tanstack/react-query'
import { fetchItems } from '../api/items'
import { fetchSettings } from '../api/settings'

export function useSettings() {
  return useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
}

export function useItems(start: Date, end: Date) {
  return useQuery({
    queryKey: ['items', start.toISOString(), end.toISOString()],
    queryFn: () => fetchItems(start, end),
  })
}
