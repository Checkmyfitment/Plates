// Stripe's other half of create-checkout-session: fires when a seller
// actually completes payment, and applies the same "feature this listing
// for 7 days" boost the native app applies via apply-native-boost.
//
// Configure in Stripe dashboard -> Developers -> Webhooks -> Add endpoint,
// pointing at this function's URL, listening for `checkout.session.completed`.
// Needs two secrets: STRIPE_SECRET_KEY (same as create-checkout-session)
// and STRIPE_WEBHOOK_SECRET (shown once when you create the webhook
// endpoint in the Stripe dashboard, starts with whsec_) -- the signature
// check below is what stops anyone else from POSTing a fake "payment
// succeeded" event at this URL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')

const BOOST_DAYS = 7
const BOOST_PRICE_CENTS = 499

Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return new Response('not configured', { status: 503 })
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

    const signature = req.headers.get('stripe-signature')
    if (!signature) return new Response('missing signature', { status: 400 })

    const body = await req.text()
    let event: Stripe.Event
    try {
      // constructEventAsync (not the sync constructEvent) -- Deno's
      // SubtleCrypto-based Stripe SDK build needs the async signature
      // verification path
      event = await stripe.webhooks.constructEventAsync(body, signature, STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error('Stripe signature verification failed', err)
      return new Response('invalid signature', { status: 400 })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const listingId = session.metadata?.listing_id
      const sellerId = session.metadata?.seller_id
      if (!listingId || !sellerId) {
        console.error('checkout session missing metadata', session.id)
        return new Response('ok', { status: 200 }) // acknowledge -- retrying won't fix missing metadata
      }

      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
      const { error } = await supabase.rpc('apply_listing_boost', {
        p_listing_id: listingId,
        p_seller_id: sellerId,
        p_provider: 'stripe',
        // Checkout session id is unique per payment and is what
        // apply_listing_boost's unique index de-dupes on, so a Stripe
        // webhook retry can't double-apply the boost
        p_provider_transaction_id: session.id,
        p_platform: 'web',
        p_amount_cents: session.amount_total ?? BOOST_PRICE_CENTS,
        p_currency: session.currency ?? 'usd',
        p_days: BOOST_DAYS,
      })
      if (error) {
        console.error('apply_listing_boost failed', error)
        return new Response('apply failed', { status: 500 })
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('stripe-webhook error', err)
    return new Response('internal error', { status: 500 })
  }
})
