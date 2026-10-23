// Browsers (and the iOS/Android WebViews) refuse to call a function on
// another domain unless that function answers a pre-flight OPTIONS request
// and sends these headers back. Without this the purchase buttons fail
// before the request even leaves the page. `*` is fine here: every function
// that uses it still requires the caller's own signed-in token.
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders }) : null
}

export function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
