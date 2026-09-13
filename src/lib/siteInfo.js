// Interim support inbox — your personal email, until hello@passtheplates.app
// (business email) is set up. Swap this the moment that's live; shown across
// the legal pages and the suspended-account screen.
export const SUPPORT_EMAIL = 'chinmichael705@gmail.com'

// Live custom domain (passtheplates.app apex redirects here to www, so
// this is the actual canonical URL browsers/crawlers land on). Used to
// build rich link-preview cards (photo/title/price) when a listing is
// shared — see supabase/functions/share-listing.
export const SITE_URL = 'https://www.passtheplates.app'

// Real Cloudflare Turnstile site key (widget "Plates signup", covers
// www.passtheplates.app + localhost) — replaces the public test key. The
// matching secret key is set as a Supabase secret; see Authentication ->
// Settings -> Bot and Abuse Protection -> Cloudflare Turnstile in the
// Supabase dashboard.
export const TURNSTILE_SITE_KEY = '0x4AAAAAAEsXBcVoSAIqPhxV'

// RevenueCat *public* SDK keys (safe to ship in client code — these only
// let the app start a purchase, not read/write account data; that needs
// the separate secret key, which lives only in the apply-native-boost
// Edge Function). One key per store, from RevenueCat dashboard -> Project
// -> [app] -> API keys, after creating the iOS and Android apps there.
// See CHECKLIST.md's "Paid featured listings setup" section. Empty until
// then — src/lib/iap.js no-ops safely without them.
export const REVENUECAT_IOS_API_KEY = ''
export const REVENUECAT_ANDROID_API_KEY = ''

// The RevenueCat "offering" -> "package" identifiers set up in the
// RevenueCat dashboard for the one-time "feature this listing" purchase.
// See CHECKLIST.md.
export const FEATURE_LISTING_PACKAGE_ID = 'feature_listing_7day'

// One switch for whether real payment (RevenueCat on iOS/Android, Stripe
// on web) is wired up and tested end-to-end. False keeps the existing
// "Request to be featured" -> admin manually arranges payment flow
// exactly as it's always worked — nothing breaks while RevenueCat/Stripe
// are still being set up. Flip to true only after a real test purchase
// has gone through on each platform you plan to launch with; see
// CHECKLIST.md's "Paid featured listings setup".
export const PAID_BOOSTS_LIVE = false
