// Serves a rich link-preview card (title/price/photo) for a shared listing
// link, then redirects a real visitor into the app. Plain client-side SPAs
// can't do this on their own — a crawler (iMessage, Slack, Facebook,
// Twitter/X, etc.) fetches the URL once and reads whatever HTML comes back
// in that single response, without running any JavaScript, so the OG tags
// have to already be in the markup. This function fetches the listing,
// renders that markup, and immediately redirects human visitors onward.
//
// Called from a listing's "Share" button (see src/components/
// ListingDetail.jsx) once SITE_URL in src/lib/siteInfo.js has been changed
// from its placeholder — until then, sharing just copies a plain in-app
// link instead, since a preview card pointing at a placeholder domain
// wouldn't be useful.

import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SITE_URL = Deno.env.get('SITE_URL') || 'https://yourplatesapp.com'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

Deno.serve(async (req) => {
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  const dest = id ? `${SITE_URL}/?listing=${encodeURIComponent(id)}` : SITE_URL

  if (!id) {
    return Response.redirect(dest, 302)
  }

  const { data: listing } = await supabase
    .from('listings')
    .select('title, price, photo_url, seller:profiles!listings_seller_id_fkey(name)')
    .eq('id', id)
    .maybeSingle()

  if (!listing) {
    return Response.redirect(dest, 302)
  }

  const title = escapeHtml(listing.title ?? 'A listing on Plates')
  const sellerName = escapeHtml(listing.seller?.name ?? 'a neighbor')
  const description = escapeHtml(`$${listing.price} from ${sellerName} on Plates — homemade food nearby.`)
  const pageUrl = `${SITE_URL}/?listing=${encodeURIComponent(id)}`
  // no photo on the listing → skip the image tags rather than point at a
  // fallback image file this project doesn't ship. Most social platforms
  // still render a text-only preview card fine without one.
  const imageTags = listing.photo_url
    ? `<meta property="og:image" content="${escapeHtml(listing.photo_url)}">
<meta name="twitter:image" content="${escapeHtml(listing.photo_url)}">`
    : ''

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title} — Plates</title>
<meta property="og:title" content="${title} — Plates">
<meta property="og:description" content="${description}">
${imageTags}
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
<meta name="twitter:card" content="${listing.photo_url ? 'summary_large_image' : 'summary'}">
<meta name="twitter:title" content="${title} — Plates">
<meta name="twitter:description" content="${description}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(dest)}">
<script>window.location.replace(${JSON.stringify(dest)});</script>
</head>
<body>Redirecting to <a href="${escapeHtml(dest)}">Plates</a>…</body>
</html>`

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
})
