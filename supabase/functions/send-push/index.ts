// Sends a real push notification whenever a new row lands in
// public.notifications. Deployed as a Supabase Edge Function and invoked by
// a Database Webhook (Dashboard → Database → Webhooks) configured on
// "insert on public.notifications" — see CHECKLIST.md for the exact setup
// steps, since that part is dashboard configuration, not SQL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@example.com'

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record?.user_id) {
      return new Response('ignored', { status: 200 })
    }

    const { data: subs, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', record.user_id)

    if (error) throw error

    const notificationPayload = JSON.stringify({
      title: 'Plates',
      body: record.message ?? 'You have a new notification',
      url: '/',
    })

    await Promise.all(
      (subs ?? []).map(async (sub) => {
        const subscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        }
        try {
          await webpush.sendNotification(subscription, notificationPayload)
        } catch (err) {
          const statusCode = err?.statusCode
          if (statusCode === 404 || statusCode === 410) {
            // subscription is dead (user revoked permission, uninstalled, etc.) — clean it up
            await supabase.from('push_subscriptions').delete().eq('id', sub.id)
          } else {
            console.error('Push send failed', err)
          }
        }
      }),
    )

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('send-push error', err)
    return new Response('error', { status: 500 })
  }
})
