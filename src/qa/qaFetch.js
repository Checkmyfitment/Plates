// Installs a fetch wrapper for the QA harness:
//  - reads of public data pass through to the real database (anonymous key)
//  - the QA user's own data (orders, chats, notifications, profile) is served
//    from seed.js
//  - EVERY write (POST/PATCH/PUT/DELETE) to Supabase is answered locally and
//    never sent, so nothing in the real database can change
import { QA_USER, QA_PROFILE, BUYER_ORDERS, SELLER_ORDERS, NOTIFICATIONS, CHATS } from './seed.js'

const SUPABASE = import.meta.env.VITE_SUPABASE_URL
const realFetch = window.fetch.bind(window)
export const blockedWrites = (window.__qaBlocked = [])

// last real listing rows seen, so a fake "save" can answer with the full row
const listingCache = new Map()

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

const headerOf = (init, name) => { try { return new Headers(init?.headers ?? {}).get(name) || '' } catch { return '' } }
const wantsObject = (init) => /vnd\.pgrst\.object/.test(headerOf(init, 'accept'))

window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url
  const method = (init.method || (typeof input !== 'string' && input.method) || 'GET').toUpperCase()
  if (!url.startsWith(SUPABASE)) return realFetch(input, init)

  const u = new URL(url)
  const path = u.pathname
  const qs = u.search

  if (method !== 'GET' && method !== 'HEAD') {
    // auth/realtime plumbing and every database write: answer locally
    let body = null
    try { body = init.body ? JSON.parse(init.body) : null } catch { /* ignore */ }
    blockedWrites.push({ method, path, qs: qs.slice(0, 120), body })
    if (path.startsWith('/functions/v1/')) return json({ url: `${window.location.origin}/qa.html#stripe-checkout-was-requested`, ok: true })
    if (path.startsWith('/rest/v1/rpc/')) return json([])
    let echo = Array.isArray(body) ? body : body ? [{ id: 'qa-new-row', ...body }] : []
    if (path === '/rest/v1/listings' && body) {
      const idMatch = qs.match(/id=eq\.([^&]+)/)
      const existing = idMatch ? listingCache.get(decodeURIComponent(idMatch[1])) : null
      if (existing) echo = [{ ...existing, ...body }]            // update: merge into the real row
      else {                                                       // insert: a plausible new row
        const b = Array.isArray(body) ? body[0] : body
        echo = [{ id: `qa-new-${Date.now()}`, views: 0, available: true, featured: false, created_at: new Date().toISOString(),
          seller: { name: 'QA Tester', kitchen: 'QA Test Kitchen', neighborhood: 'Berkeley' }, ...b }]
      }
    }
    return json(wantsObject(init) ? echo[0] ?? {} : echo, 201)
  }

  const table = path.startsWith('/rest/v1/') ? path.slice('/rest/v1/'.length) : null
  const countOnly = method === 'HEAD' || /count=exact/.test(headerOf(init, 'prefer'))
  const reply = (rows) => {
    const out = wantsObject(init) ? rows[0] ?? null : rows
    if (wantsObject(init) && !rows.length) return json({ message: 'no rows', code: 'PGRST116' }, 406)
    return json(countOnly ? [] : out, 200, { 'Content-Range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` })
  }

  if (table === 'orders') {
    if (qs.includes(`buyer_id=eq.${QA_USER}`)) {
      let rows = BUYER_ORDERS
      if (qs.includes('status=in.')) {
        const set = qs.match(/status=in\.\(([^)]*)\)/)?.[1].split(',') ?? []
        rows = rows.filter((r) => set.includes(r.status))
      }
      return reply(rows)
    }
    if (qs.includes(`seller_id=eq.${QA_USER}`)) return reply(SELLER_ORDERS)
    return reply([])
  }
  if (table === 'notifications') return reply(NOTIFICATIONS)
  if (table === 'chats') return reply(CHATS)
  if (table === 'profiles' && qs.includes(`id=eq.${QA_USER}`)) return reply([QA_PROFILE])

  // public reads pass through; make the first two real listings "yours" so
  // Your listings / Edit / Dashboard have something to work with
  if (table === 'listings') {
    const res = await realFetch(input, init)
    if (!res.ok) return res
    const rows = await res.clone().json().catch(() => null)
    if (Array.isArray(rows) && !countOnly) {
      ;(new URLSearchParams(location.search).has('buyer') ? [] : rows.slice(0, 2)).forEach((r) => { r.seller_id = QA_USER; if (r.seller) r.seller = { ...r.seller, name: 'QA Tester' } })
      rows.forEach((r) => r?.id && listingCache.set(r.id, r))
      return json(rows, 200, { 'Content-Range': res.headers.get('Content-Range') || '' })
    }
    return res
  }
  return realFetch(input, init)
}
