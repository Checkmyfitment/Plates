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
import { preflight, reply } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SITE_URL = Deno.env.get('SITE_URL') || 'https://www.passtheplates.app'

const BOOST_PRICE_CENTS = 499

Deno.serve(async (req) => {
  const early = preflight(req)
  if (early) return early
  try {
    if (!STRIPE_SECRET_KEY) {
      return reply({ error: 'not configured' }, 503)
    }
    const stripe = new Stripe(STRIPE_SECRET_KEY)

    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return reply({ error: 'unauthorized' }, 401)

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return reply({ error: 'unauthorized' }, 401)
    }
    const sellerId = userData.user.id

    // a banned account shouldn't be able to buy promotion
    const { data: sellerProfile } = await supabase.from('profiles').select('banned').eq('id', sellerId).single()
    if (sellerProfile?.banned) return reply({ error: 'not allowed' }, 403)

    const { listing_id } = await req.json().catch(() => ({}))
    if (!listing_id) return reply({ error: 'missing listing_id' }, 400)

    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, title, seller_id')
      .eq('id', listing_id)
      .single()
    if (listingErr || !listing || listing.seller_id !== sellerId) {
      return reply({ error: 'not your listing' }, 403)
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // 'card' covers Apple Pay and Google Pay too; they show up
      // automatically on devices that support them
      payment_method_types: ['card'],
      // so Stripe emails the seller a receipt
      customer_email: userData.user.email ?? undefined,
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

    return reply({ url: session.url })
  } catch (err) {
    console.error('create-checkout-session error', err)
    return reply({ error: 'internal error' }, 500)
  }
})
