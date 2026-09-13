import { supabase, SUPABASE_URL } from './supabaseClient'

// Web equivalent of lib/iap.js — pays to feature a listing via Stripe
// Checkout instead of a native store purchase. See
// supabase/functions/create-checkout-session and stripe-webhook for the
// server side. Redirects the whole page to Stripe's hosted checkout;
// there's no client-side Stripe.js needed for this since we never
// collect card details ourselves.
export async function startFeaturedListingCheckout(listingId) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ listing_id: listingId }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.url) {
    throw new Error(body.error || 'Could not start checkout — try again.')
  }
  window.location.href = body.url
}
