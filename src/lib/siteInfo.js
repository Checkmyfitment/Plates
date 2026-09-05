// TODO: replace with your real support inbox before launch — this is a
// placeholder used across the legal pages and the suspended-account screen.
export const SUPPORT_EMAIL = 'support@yourplatesapp.com'

// TODO: replace with your real deployed app URL once you go live. Used to
// build rich link-preview cards (photo/title/price) when a listing is
// shared — see supabase/functions/share-listing. Until this is changed from
// the placeholder, sharing a listing just copies a plain in-app link
// instead (still works, just no preview card).
export const SITE_URL = 'https://yourplatesapp.com'

// TODO: replace with your real Cloudflare Turnstile site key before launch
// (free at dash.cloudflare.com/?to=/:account/turnstile — takes about 2
// minutes, no billing required). This is Cloudflare's public TEST key,
// which always renders a widget that passes -- safe to leave in during
// development, but it does not actually block anything, so signup has no
// real bot protection until you swap this out. You'll also need to paste
// the matching *secret* key into Supabase (Authentication -> Settings ->
// Bot and Abuse Protection -> enable Cloudflare Turnstile) -- until that's
// done there too, the token this widget produces is generated but never
// checked, so nothing breaks, it's just not protecting anything yet.
export const TURNSTILE_SITE_KEY = '1x00000000000000000000AA'
