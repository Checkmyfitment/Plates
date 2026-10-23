import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { supabase, SUPABASE_URL } from './supabaseClient'
import { isNativeIAPSupported, ensureIAPConfigured } from './iap'
import { PRO_PACKAGE_ID, PRO_PAYMENTS_LIVE } from './siteInfo'

// How the "Go Pro" card should behave for this device:
//   'hidden'  - show nothing (native app while payments aren't live, or the
//               store purchase isn't configured in this build). Apple and
//               Google don't allow pointing people to outside payment for a
//               digital subscription inside their apps.
//   'request' - the original manual flow ("message us to upgrade"), web only
//   'buy'     - real purchase: Stripe on the web, an in-app subscription
//               through RevenueCat on iOS/Android
export function getProOffer({ platform = Capacitor.getPlatform(), live = PRO_PAYMENTS_LIVE, nativeIAP = isNativeIAPSupported() } = {}) {
  const native = platform === 'ios' || platform === 'android'
  if (native) return live && nativeIAP ? 'buy' : 'hidden'
  return live ? 'buy' : 'request'
}

// Web: sends the seller to Stripe's hosted Checkout (which offers Apple Pay
// and Google Pay automatically). The page navigates away on success.
export async function startProCheckout() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-pro-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
    body: JSON.stringify({}),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok || !body.url) {
    throw new Error(
      res.status === 409 ? "You're already a Pro seller." : body.error || 'Could not start checkout — try again.',
    )
  }
  window.location.href = body.url
}

// iOS/Android: buys the monthly Pro subscription through the store. Unlike
// Featured listings there is nothing to send our server afterwards -- the
// store tells RevenueCat, and RevenueCat's webhook (revenuecat-webhook)
// flips profiles.is_pro. The caller should refresh the profile a moment
// later to pick it up.
export async function purchasePro(userId) {
  if (!isNativeIAPSupported()) {
    throw new Error('Subscriptions are only available in the installed app.')
  }
  await ensureIAPConfigured(userId)
  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages?.find(
    (p) => p.identifier === PRO_PACKAGE_ID || p.storeProduct?.identifier === PRO_PACKAGE_ID,
  )
  if (!pkg) throw new Error('Pro is not available right now — try again later.')
  await Purchases.purchasePackage({ aPackage: pkg })
}

// Apple requires every app that sells subscriptions to offer a "Restore
// purchases" action (reinstalls, new phone).
export async function restorePro(userId) {
  if (!isNativeIAPSupported()) return
  await ensureIAPConfigured(userId)
  await Purchases.restorePurchases()
}
