// Creates a Stripe Checkout session for a seller subscribing to Plates Pro
// on the WEB (monthly). The native apps sell Pro through in-app purchases
// via RevenueCat instead -- Apple and Google require that for digital
// subscriptions inside their apps (see revenuecat-webhook).
//
// Stripe's hosted Checkout automatically offers Apple Pay and Google Pay
// where the buyer's device supports them, so no extra wallet setup is
// needed beyond verifying your domain in the Stripe dashboard.
//
// Secrets: STRIPE_SECRET_KEY (shared with create-checkout-session),
// optional STRIPE_PRO_PRICE_ID (a recurring Price created in the Stripe
// dashboard -- if unset, a $9/month price is created inline), SITE_URL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'
import { preflight, reply } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_PRO_PRICE_ID = Deno.env.get('STRIPE_PRO_PRICE_ID')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.passtheplates.app'

const PRO_PRICE_CENTS = 900

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  try {
    if (!STRIPE_SECRET_KEY) return reply({ error: 'not configured' }, 503)
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!jwt) return reply({ error: 'unauthorized' }, 401)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) return reply({ error: 'unauthorized' }, 401)
    const user = userData.user

    // already Pro? don't sell a second subscription
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, banned')
      .eq('id', user.id)
      .single()
    if (profile?.banned) return reply({ error: 'not allowed' }, 403)
    if (profile?.is_pro) return reply({ error: 'already pro' }, 409)

    const lineItem = STRIPE_PRO_PRICE_ID
      ? { price: STRIPE_PRO_PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            unit_amount: PRO_PRICE_CENTS,
            recurring: { interval: 'month' as const },
            product_data: {
              name: 'Plates Pro',
              description: 'Pro badge, priority support, and your listings featured in Browse.',
            },
          },
          quantity: 1,
        }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [lineItem],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      // user id on both the session and the subscription itself, so later
      // renewal/cancellation events (which carry only the subscription)
      // can still be tied back to the right account
      metadata: { user_id: user.id, kind: 'pro' },
      subscription_data: { metadata: { user_id: user.id, kind: 'pro' } },
      success_url: `${SITE_URL}/?pro=1`,
      cancel_url: `${SITE_URL}/?pro_cancelled=1`,
    })

    return reply({ url: session.url })
  } catch (err) {
    console.error('create-pro-checkout-session error', err)
    return reply({ error: 'internal error' }, 500)
  }
})
