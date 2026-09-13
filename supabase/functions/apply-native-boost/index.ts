// Applies a "feature this listing for 7 days" purchase made through the
// native iOS/Android app via RevenueCat (wrapping StoreKit / Google Play
// Billing). See supabase/functions/stripe-webhook for the web equivalent.
//
// Why the client calls this directly, rather than only relying on a
// RevenueCat webhook: RevenueCat's webhook events carry the RevenueCat
// app_user_id and product id, but not which *listing* the purchase was
// for -- that's app-specific context RevenueCat has no concept of. The
// standard pattern for exactly this (see RevenueCat's own docs on
// "one-time purchases with custom context") is: the client completes the
// purchase, then calls your own backend with the app-specific details;
// your backend re-verifies the purchase actually happened by asking
// RevenueCat's API directly, rather than trusting the client's word for
// it. That verification step is the whole point of this function --
// without it, anyone could call this with a fake transaction id and get
// a free boost.
//
// Needs two secrets:
//   - REVENUECAT_SECRET_API_KEY: RevenueCat dashboard -> Project settings
//     -> API keys -> Secret key (starts with sk_, NOT the public SDK key
//     the app itself uses)
//   - SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL: already set on every
//     Supabase project's Edge Functions automatically

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')

const BOOST_DAYS = 7

Deno.serve(async (req) => {
  try {
    if (!REVENUECAT_SECRET_API_KEY) {
      return new Response(JSON.stringify({ error: 'not configured' }), { status: 503 })
    }

    // identify the caller from their own auth token, the same way every
    // other authenticated Edge Function in this project does -- never
    // trust a seller_id passed in the request body
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.replace('Bearer ', '')
    if (!jwt) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }
    const sellerId = userData.user.id

    const { listing_id, transaction_id, revenuecat_app_user_id, platform } = await req.json()
    if (!listing_id || !transaction_id || !revenuecat_app_user_id || !platform) {
      return new Response(JSON.stringify({ error: 'missing fields' }), { status: 400 })
    }
    if (platform !== 'ios' && platform !== 'android') {
      return new Response(JSON.stringify({ error: 'invalid platform' }), { status: 400 })
    }

    // the caller must actually own the listing they're paying to feature
    const { data: listing, error: listingErr } = await supabase
      .from('listings')
      .select('id, seller_id')
      .eq('id', listing_id)
      .single()
    if (listingErr || !listing || listing.seller_id !== sellerId) {
      return new Response(JSON.stringify({ error: 'not your listing' }), { status: 403 })
    }

    // ask RevenueCat directly whether this transaction is real, rather
    // than trusting the client -- this is the actual security boundary
    const rcRes = await fetch(
      `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(revenuecat_app_user_id)}`,
      { headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` } }
    )
    if (!rcRes.ok) {
      console.error('RevenueCat lookup failed', rcRes.status, await rcRes.text())
      return new Response(JSON.stringify({ error: 'could not verify purchase' }), { status: 502 })
    }
    const rcData = await rcRes.json()

    // non_subscriptions holds one-time/consumable purchase history, keyed
    // by product id, each entry carrying its own transaction id
    const nonSubs = rcData?.subscriber?.non_subscriptions || {}
    const allTransactions = Object.values(nonSubs).flat() as Array<{ id?: string; store?: string }>
    const matched = allTransactions.find((t) => t.id === transaction_id)
    if (!matched) {
      return new Response(JSON.stringify({ error: 'transaction not found for this purchase' }), { status: 402 })
    }

    const { error: applyErr } = await supabase.rpc('apply_listing_boost', {
      p_listing_id: listing_id,
      p_seller_id: sellerId,
      p_provider: 'revenuecat',
      p_provider_transaction_id: transaction_id,
      p_platform: platform,
      p_amount_cents: 499,
      p_currency: 'usd',
      p_days: BOOST_DAYS,
    })
    if (applyErr) {
      console.error('apply_listing_boost failed', applyErr)
      return new Response(JSON.stringify({ error: 'could not apply boost' }), { status: 500 })
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  } catch (err) {
    console.error('apply-native-boost error', err)
    return new Response(JSON.stringify({ error: 'internal error' }), { status: 500 })
  }
})
