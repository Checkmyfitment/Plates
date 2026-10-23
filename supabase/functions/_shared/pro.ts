// Pure helpers shared by the Plates Pro webhooks (stripe-webhook and
// revenuecat-webhook). Kept free of any Deno/Supabase imports so they can be
// unit tested with the app's normal test runner (see pro.test.ts).
//
// Both webhooks end by calling the apply_pro_subscription() SQL function with
// a status from the list below; that function decides whether the person
// currently has Pro. See supabase/migration_pro_subscriptions.sql.

export type ProStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

// Stripe's own subscription statuses -> ours. "canceled" here means the
// subscription has fully ended; a person who just turned off auto-renew is
// still `active` in Stripe with cancel_at_period_end = true, and keeps Pro
// until the paid period runs out.
export function mapStripeStatus(status: string, cancelAtPeriodEnd = false): ProStatus {
  switch (status) {
    case 'active':
      return cancelAtPeriodEnd ? 'canceled' : 'active'
    case 'trialing':
      return 'trialing'
    case 'past_due':
      return 'past_due'
    default:
      // unpaid, canceled, incomplete, incomplete_expired, paused, anything new
      return 'expired'
  }
}

// Stripe moved a subscription's paid-through date from the subscription
// itself (older API versions) to its line items (API 2025-03-31 and later).
// New Stripe accounts default to the newer layout, so read both.
export function stripePeriodEnd(sub: {
  current_period_end?: number | null
  items?: { data?: Array<{ current_period_end?: number | null }> }
}): Date | null {
  const seconds = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null
}

export interface RevenueCatEvent {
  type?: string
  app_user_id?: string
  product_id?: string
  store?: string
  period_type?: string
  expiration_at_ms?: number | null
  transaction_id?: string
  original_transaction_id?: string
}

export interface ProUpdate {
  userId: string
  subscriptionId: string
  platform: 'ios' | 'android'
  status: ProStatus
  periodEnd: Date | null
}

// product ids that count as Plates Pro; anything else (e.g. the one-time
// Featured listing purchase) is ignored here
export function isProProduct(productId: string | undefined, allowed: string[]): boolean {
  if (!productId) return false
  if (allowed.length > 0) return allowed.includes(productId)
  return productId.startsWith('pro_') || productId.startsWith('plates_pro')
}

// One RevenueCat webhook event -> the update to apply, or null when the event
// is irrelevant (a test ping, a one-time purchase, a non-store subscription,
// an anonymous RevenueCat user that isn't linked to a Plates account...).
export function mapRevenueCatEvent(event: RevenueCatEvent, allowedProducts: string[] = []): ProUpdate | null {
  if (!event || !event.type) return null
  if (!isProProduct(event.product_id, allowedProducts)) return null
  // our app configures RevenueCat with the Supabase user id as the app user
  // id; anonymous ids ($RCAnonymousID:...) can't be tied to an account
  if (!isUuid(event.app_user_id)) return null

  const platform = event.store === 'APP_STORE' ? 'ios' : event.store === 'PLAY_STORE' ? 'android' : null
  if (!platform) return null

  const subscriptionId = event.original_transaction_id || event.transaction_id
  if (!subscriptionId) return null

  let status: ProStatus
  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
      status = event.period_type === 'TRIAL' ? 'trialing' : 'active'
      break
    case 'CANCELLATION':
      // auto-renew turned off: they've paid through expiration_at_ms
      status = 'canceled'
      break
    case 'BILLING_ISSUE':
      status = 'past_due'
      break
    case 'EXPIRATION':
      status = 'expired'
      break
    default:
      return null
  }

  const periodEnd = typeof event.expiration_at_ms === 'number' ? new Date(event.expiration_at_ms) : null
  return { userId: event.app_user_id, subscriptionId, platform, status, periodEnd }
}

// constant-time string compare for shared-secret checks
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
