// Sends a real push notification whenever a new row lands in
// public.notifications. Deployed as a Supabase Edge Function and invoked by
// a Database Webhook (Dashboard → Database → Webhooks) configured on
// "insert on public.notifications" — see CHECKLIST.md for the exact setup
// steps, since that part is dashboard configuration, not SQL.
//
// Two independent delivery paths, sent in parallel:
//   1. Web Push, to every row in public.push_subscriptions (browser tabs).
//   2. FCM v1, to every row in public.native_push_tokens (the installed
//      iOS/Android app, via @capacitor/push-notifications). This path only
//      activates once FCM_SERVICE_ACCOUNT_JSON is set as a secret — until
//      then it's a clean no-op, so deploying this doesn't require Firebase
//      to already be set up. See CHECKLIST.md's "Push notifications setup"
//      section for exactly how to get that secret.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@example.com'
const FCM_SERVICE_ACCOUNT_JSON = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// --- FCM v1 (native iOS + Android) -----------------------------------

let cachedAccessToken: { token: string; expiresAt: number } | null = null
let cachedProjectId: string | null = null

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const clean = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Signs a short-lived Google OAuth2 JWT with the service account's private
// key and exchanges it for an access token — the FCM v1 API needs an OAuth
// bearer token, not a static server key (Google shut the old legacy HTTP API
// down in 2024).
async function getFcmAccessToken(): Promise<{ accessToken: string; projectId: string } | null> {
  if (!FCM_SERVICE_ACCOUNT_JSON) return null

  if (cachedAccessToken && cachedProjectId && Date.now() < cachedAccessToken.expiresAt) {
    return { accessToken: cachedAccessToken.token, projectId: cachedProjectId }
  }

  const account = JSON.parse(FCM_SERVICE_ACCOUNT_JSON)
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned))
  const jwt = `${unsigned}.${base64UrlEncode(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    console.error('FCM token exchange failed', await res.text())
    return null
  }
  const data = await res.json()
  cachedAccessToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 }
  cachedProjectId = account.project_id
  return { accessToken: cachedAccessToken.token, projectId: cachedProjectId }
}

async function sendFcm(accessToken: string, projectId: string, deviceToken: string, title: string, body: string) {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title, body },
        data: { url: '/' },
      },
    }),
  })
  if (res.ok) return { ok: true }
  const text = await res.text()
  // UNREGISTERED / NOT_FOUND means the token is dead (app uninstalled, etc.)
  const dead = text.includes('UNREGISTERED') || text.includes('NOT_FOUND') || res.status === 404
  return { ok: false, dead, error: text }
}

Deno.serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    if (!record?.user_id) {
      return new Response('ignored', { status: 200 })
    }

    const title = 'Plates'
    const body = record.message ?? 'You have a new notification'

    const [{ data: webSubs, error: webErr }, { data: nativeTokens, error: nativeErr }] = await Promise.all([
      supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth_key').eq('user_id', record.user_id),
      supabase.from('native_push_tokens').select('id, token').eq('user_id', record.user_id),
    ])
    if (webErr) throw webErr
    if (nativeErr) throw nativeErr

    const webPushSends = (webSubs ?? []).map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      }
      try {
        await webpush.sendNotification(subscription, JSON.stringify({ title, body, url: '/' }))
      } catch (err) {
        const statusCode = err?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // subscription is dead (user revoked permission, uninstalled, etc.) — clean it up
          await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        } else {
          console.error('Web push send failed', err)
        }
      }
    })

    const nativeSends = (async () => {
      if (!nativeTokens?.length) return
      const auth = await getFcmAccessToken()
      if (!auth) return // FCM not configured yet — silent no-op, not an error

      await Promise.all(
        nativeTokens.map(async (row) => {
          const result = await sendFcm(auth.accessToken, auth.projectId, row.token, title, body)
          if (!result.ok) {
            if (result.dead) {
              await supabase.from('native_push_tokens').delete().eq('id', row.id)
            } else {
              console.error('FCM send failed', result.error)
            }
          }
        }),
      )
    })()

    await Promise.all([...webPushSends, nativeSends])

    return new Response('ok', { status: 200 })
  } catch (err) {
    console.error('send-push error', err)
    return new Response('error', { status: 500 })
  }
})
