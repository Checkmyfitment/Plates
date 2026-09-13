// Creates a Stripe Checkout session for a seller paying to feature one of
// their own listings for 7 days -- the web equivalent of the native
// RevenueCat/StoreKit/Play Billing purchase (see apply-native-boost).
// Apple and Google require in-app purchases for this kind of digital
// feature inside the native app, but there's no such requirement on the
// web, and Stripe's cut (~2.9% + 30c) is far lower than the 15-30% an app
// store IAP takes -- so the web app uses Stripe directly instead.
//
// Needs one secret: STRIPE_SECRET_KEY (Stripe dashboard -> Developers ->
// API keys -> Secret key). Also needs SITE_URL set so the success/cancel
// redirect goes back to the right place.

import { createClient } from 'npm:@supabase/supabase-js@2'
import Stripe from 'npm:stripe@17'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.passtheplates.app'

const BOOST_PRICE_CENTS = 499

Deno.serve(async (req) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'not configured' }), { status: 503 })
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }
    const sellerId = userData.user.id

    const { listing_id } = await req.json()
    if (!listing_id) return new Response(JSON.stringify({ error: 'missing listing_id' }), { status: 400 })

    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, seller_id')
      .eq('id', listing_id)
      .single()
    if (listingErr || !listing || listing.seller_id !== sellerId) {
      return new Response(JSON.stringify({ error: 'not your listing' }), { status: 403 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: BOOST_PRICE_CENTS,
            product_data: {
              name: `Feature "${listing.title}" for 7 days`,
              description: 'Sorts to the top of Browse and shows a Featured badge.',
            },
          },
          quantity: 1,
        },
      ],
      // read back in the webhook to know which listing/seller to credit --
      // this is the web equivalent of the transaction lookup
      // apply-native-boost does against RevenueCat
      metadata: { listing_id, seller_id: sellerId },
      success_url: `${SITE_URL}/?boosted=1`,
      cancel_url: `${SITE_URL}/?boost_cancelled=1`,
    })

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('create-checkout-session error', err)
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 })
  }
})
