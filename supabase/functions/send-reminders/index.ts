// Runs every minute (pg_cron -> pg_net). Claims due reminders and sends them with Web Push.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import webpush from 'web-push'
import { nextNudge } from '../../../shared/rules.ts'
import type { Item, ReminderRow } from '../../../shared/types.ts'

type Due = ReminderRow & { id: string; user_id: string; item_id: string; fire_at: string }

const LATE_MS = 60 * 60_000 // a reminder this late is skipped, except nudges

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) {
    return new Response('unauthorized', { status: 401 })
  }

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT')!,
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  )

  const { data, error } = await db.rpc('claim_due_reminders', { p_limit: 100 })
  if (error) return new Response(error.message, { status: 500 })
  const due = data as Due[]

  const now = new Date()
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const r of due) {
    if (r.kind === 'offset' && now.getTime() - new Date(r.fire_at).getTime() > LATE_MS) {
      skipped++
      continue
    }

    const { data: subs, error: subsError } = await db.from('push_subscriptions').select('*').eq('user_id', r.user_id)
    if (subsError) {
      errors.push(`subscriptions: ${subsError.message}`)
      continue
    }
    const payload = JSON.stringify({ title: r.title, body: r.body, url: '/' })
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 3600,
          urgency: 'high',
        })
        sent++
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
        else {
          console.error('push failed', status, (e as Error).message)
          errors.push(`push ${status ?? ''}: ${(e as Error).message}`)
        }
      }
    }

    if (r.kind === 'nudge') await rearmNudge(db, r, now)
  }

  return Response.json({ claimed: due.length, sent, skipped, errors })
})

// Keep asking until the project is logged: queue the next nudge a full interval after this send.
async function rearmNudge(db: SupabaseClient, r: Due, now: Date) {
  const { data: item } = await db.from('items').select('*').eq('id', r.item_id).single()
  if (!item || (item as Item).status !== 'open') return
  const { data: settings } = await db.from('user_settings').select('default_nudge_days').eq('user_id', r.user_id).single()
  const next = nextNudge(item as Item, settings ?? { default_nudge_days: 2 }, now)
  await db.from('reminders').insert({ user_id: r.user_id, item_id: r.item_id, ...next })
}
