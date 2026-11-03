import { supabase } from '../lib/supabase'

export async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: sub.endpoint,
      p256dh: json.keys!.p256dh,
      auth: json.keys!.auth,
      user_agent: navigator.userAgent,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw error
}

export async function deleteSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) throw error
}
