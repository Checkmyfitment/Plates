import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'
import { supabase, SUPABASE_URL } from './supabaseClient'
import { REVENUECAT_IOS_API_KEY, REVENUECAT_ANDROID_API_KEY, FEATURE_LISTING_PACKAGE_ID } from './siteInfo'

// Native in-app purchases (iOS StoreKit / Google Play Billing) via
// RevenueCat, for paying to feature a listing — see lib/checkout.js for
// the web/Stripe equivalent, and supabase/functions/apply-native-boost
// for the server-side half that actually applies the boost after
// verifying the purchase really happened.
//
// Apple and Google both require IAP (not a web payment link) for a
// digital feature like this one inside the native app — see App Store
// Review Guideline 3.1.1. The web app uses Stripe directly instead, since
// that requirement doesn't apply there.

let configured = false

export function isNativeIAPSupported() {
  return Capacitor.isNativePlatform() && !!getApiKey()
}

function getApiKey() {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return REVENUECAT_IOS_API_KEY
  if (platform === 'android') return REVENUECAT_ANDROID_API_KEY
  return null
}

// RevenueCat needs to know who's buying, so refunds/purchase history tie
// back to the right person — configure() (or logIn() if already
// configured) with our own user id as RevenueCat's appUserID, rather than
// letting it generate an anonymous one, so apply-native-boost's lookup by
// appUserID always resolves to the signed-in Supabase user.
export async function ensureIAPConfigured(userId) {
  if (!isNativeIAPSupported() || !userId) return
  if (!configured) {
    await Purchases.configure({ apiKey: getApiKey(), appUserID: userId })
    configured = true
  } else {
    const { appUserID } = await Purchases.getAppUserID()
    if (appUserID !== userId) await Purchases.logIn({ appUserID: userId })
  }
}

// Buys the "feature this listing for 7 days" package, then asks our own
// backend to verify the purchase against RevenueCat's API and apply the
// boost — see apply-native-boost's own comment for why verification
// happens server-side instead of trusting this purchase result directly.
export async function purchaseFeaturedListing(listingId) {
  if (!isNativeIAPSupported()) {
    throw new Error('In-app purchases are only available in the installed app.')
  }

  const offerings = await Purchases.getOfferings()
  const pkg = offerings.current?.availablePackages?.find(
    (p) => p.identifier === FEATURE_LISTING_PACKAGE_ID || p.storeProduct?.identifier === FEATURE_LISTING_PACKAGE_ID,
  )
  if (!pkg) {
    throw new Error('Featured listing purchase is not available right now — try again later.')
  }

  const { transaction } = await Purchases.purchasePackage({ aPackage: pkg })
  const { appUserID } = await Purchases.getAppUserID()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const res = await fetch(`${SUPABASE_URL}/functions/v1/apply-native-boost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({
      listing_id: listingId,
      transaction_id: transaction.transactionIdentifier,
      revenuecat_app_user_id: appUserID,
      platform: Capacitor.getPlatform(),
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || 'Purchase succeeded but could not be applied — contact support.')
  }
}
