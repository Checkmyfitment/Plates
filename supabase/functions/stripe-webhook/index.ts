// Stripe's other half of create-checkout-session: fires when a seller
// actually completes payment, and applies the same "feature this listing
// for 7 days" boost the native app applies via apply-native-boost.
//
// Handles two kinds of purchase:
//   - one-time Featured listing boost (checkout.session.completed, mode=payment)
//   - Plates Pro monthly subscription (checkout.session.completed with
//     mode=subscription, plus customer.subscription.updated/deleted for
//     renewals, failed payments, cancellations)
//
// Configure in Stripe dashboard -> Developers -> Webhooks -> Add endpoint,
// pointing at this function's URL, listening for `checkout.session.completed`,
// `customer.subscription.updated`, and `customer.subscription.deleted`.
// Needs two secrets: STRIPE_SECRET_KEY (same as create-checkout-session)
// and STRIPE_WEBHOOK_SECRET (shown once when you create the webhook
// endpoint in the Stripe dashboard, starts with whsec_) -- the signature
// check below is what stops anyone else from POSTing a fake "payment
// succeeded" event at this URL.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'
import { isUuid, mapStripeStatus, stripePeriodEnd } from '../_shared/pro.ts'

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
    const stripe = new Stripe(STRIPE_SECRET_KEY)

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

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // records one Pro subscription's latest state; apply_pro_subscription
    // decides whether that means the person has Pro right now
    const applyPro = async (userId: string | undefined, sub: Stripe.Subscription) => {
      if (!isUuid(userId)) {
        console.error('pro subscription missing user id', sub.id)
        return null // acknowledge -- retrying can't fix missing metadata
      }
      const { error } = await supabase.rpc('apply_pro_subscription', {
        p_user_id: userId,
        p_provider: 'stripe',
        p_provider_subscription_id: sub.id,
        p_platform: 'web',
        p_status: mapStripeStatus(sub.status, sub.cancel_at_period_end),
        p_period_end: stripePeriodEnd(sub)?.toISOString() ?? null,
      })
      return error
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      if (session.mode === 'subscription') {
        const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
        if (!subId) {
          console.error('subscription checkout missing subscription id', session.id)
          return new Response('ok', { status: 200 })
        }
        const sub = await stripe.subscriptions.retrieve(subId)
        const error = await applyPro(session.client_reference_id ?? session.metadata?.user_id, sub)
        if (error) {
          console.error('apply_pro_subscription failed', error)
          return new Response('apply failed', { status: 500 })
        }
        return new Response('ok', { status: 200 })
      }

      // only boost once the money has actually been captured (always true
      // for card payments at completion; this guards any delayed method)
      if (session.payment_status !== 'paid') {
        console.log('checkout completed but not paid yet', session.id, session.payment_status)
        return new Response('ok', { status: 200 })
      }

      const listingId = session.metadata?.listing_id
      const sellerId = session.metadata?.seller_id
      if (!listingId || !sellerId) {
        console.error('checkout session missing metadata', session.id)
        return new Response('ok', { status: 200 }) // acknowledge -- retrying won't fix missing metadata
      }

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

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      if (sub.metadata?.kind === 'pro') {
        // a deleted subscription has ended, whatever status Stripe left on it
        const effective =
          event.type === 'customer.subscription.deleted' ? ({ ...sub, status: 'canceled' } as Stripe.Subscription) : sub
        const error = await applyPro(sub.metadata?.user_id, effective)
        if (error) {
          console.error('apply_pro_subscription failed', error)
          return new Response('apply failed', { status: 500 })
        }
      }
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('stripe-webhook error', err)
    return new Response('internal error', { status: 500 })
  }
})
