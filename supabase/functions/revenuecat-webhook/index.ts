// Receives RevenueCat's server-to-server events for Plates Pro subscriptions
// bought inside the iOS/Android apps (StoreKit / Google Play Billing), and
// keeps profiles.is_pro in sync -- including renewals, cancellations, and
// expirations that happen long after the original purchase, when the app
// isn't even open. This is the native counterpart of stripe-webhook's
// subscription handling.
//
// Setup (RevenueCat dashboard -> Project settings -> Integrations ->
// Webhooks): point it at this function's URL and set the "Authorization
// header value" to a long random string; set the same string here as the
// REVENUECAT_WEBHOOK_AUTH secret. Requests without it are rejected, which is
// what stops anyone else from POSTing a fake "this user bought Pro" event.
// Optional secret PRO_PRODUCT_IDS: comma-separated store product ids that
// count as Pro (default: any product id starting with "pro_").

import { createClient } from 'npm:@supabase/supabase-js@2'
import { mapRevenueCatEvent, safeEqual } from '../_shared/pro.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const WEBHOOK_AUTH = Deno.env.get('REVENUECAT_WEBHOOK_AUTH')
const PRO_PRODUCT_IDS = (Deno.env.get('PRO_PRODUCT_IDS') || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

Deno.serve(async (req) => {
  try {
    if (!WEBHOOK_AUTH) return new Response('not configured', { status: 503 })
    if (req.method !== 'POST') return new Response('method not allowed', { status: 405 })

    const provided = req.headers.get('Authorization') || ''
    if (!safeEqual(provided, WEBHOOK_AUTH)) return new Response('unauthorized', { status: 401 })

    const payload = await req.json().catch(() => null)
    const update = mapRevenueCatEvent(payload?.event, PRO_PRODUCT_IDS)
    // acknowledge events we don't care about so RevenueCat doesn't retry them
    if (!update) return new Response('ignored', { status: 200 })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { error } = await supabase.rpc('apply_pro_subscription', {
      p_user_id: update.userId,
      p_provider: 'revenuecat',
      p_provider_subscription_id: update.subscriptionId,
      p_platform: update.platform,
      p_status: update.status,
      p_period_end: update.periodEnd ? update.periodEnd.toISOString() : null,
    })
    if (error) {
      console.error('apply_pro_subscription failed', error)
      return new Response('apply failed', { status: 500 }) // non-2xx -> RevenueCat retries
    }
    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('revenuecat-webhook error', err)
    return new Response('internal error', { status: 500 })
  }
})
