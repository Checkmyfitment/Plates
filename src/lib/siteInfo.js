// TODO: replace with your real support inbox before launch — this is a
// placeholder used across the legal pages and the suspended-account screen.
export const SUPPORT_EMAIL = 'support@yourplatesapp.com'

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
