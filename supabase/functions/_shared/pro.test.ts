import { describe, it, expect } from 'vitest'
import { mapStripeStatus, mapRevenueCatEvent, isProProduct, isUuid, safeEqual, stripePeriodEnd } from './pro'

const USER = '123e4567-e89b-12d3-a456-426614174000'
const base = {
  type: 'INITIAL_PURCHASE',
  app_user_id: USER,
  product_id: 'pro_monthly',
  store: 'APP_STORE',
  original_transaction_id: 'orig-1',
  transaction_id: 'txn-1',
  expiration_at_ms: Date.UTC(2026, 11, 1),
}

describe('mapStripeStatus', () => {
  it('keeps Pro while active or trialing', () => {
    expect(mapStripeStatus('active')).toBe('active')
    expect(mapStripeStatus('trialing')).toBe('trialing')
  })
  it('treats "auto-renew off" as canceled (still paid through the period)', () => {
    expect(mapStripeStatus('active', true)).toBe('canceled')
  })
  it('gives a grace period when a payment fails', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due')
  })
  it('ends Pro for anything unpaid or finished, including statuses it has never seen', () => {
    for (const s of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused', 'brand_new_status']) {
      expect(mapStripeStatus(s)).toBe('expired')
    }
  })
})

describe('mapRevenueCatEvent', () => {
  it('maps a first purchase to an active Pro subscription with its end date', () => {
    const update = mapRevenueCatEvent(base)
    expect(update).toEqual({
      userId: USER,
      subscriptionId: 'orig-1',
      platform: 'ios',
      status: 'active',
      periodEnd: new Date(Date.UTC(2026, 11, 1)),
    })
  })
  it('uses Play Store -> android and falls back to transaction_id', () => {
    const update = mapRevenueCatEvent({ ...base, store: 'PLAY_STORE', original_transaction_id: undefined })
    expect(update?.platform).toBe('android')
    expect(update?.subscriptionId).toBe('txn-1')
  })
  it('marks free trials as trialing', () => {
    expect(mapRevenueCatEvent({ ...base, period_type: 'TRIAL' })?.status).toBe('trialing')
  })
  it('maps cancel, billing issue and expiration', () => {
    expect(mapRevenueCatEvent({ ...base, type: 'CANCELLATION' })?.status).toBe('canceled')
    expect(mapRevenueCatEvent({ ...base, type: 'BILLING_ISSUE' })?.status).toBe('past_due')
    expect(mapRevenueCatEvent({ ...base, type: 'EXPIRATION' })?.status).toBe('expired')
  })
  it('ignores test pings, one-time purchases and unknown events', () => {
    expect(mapRevenueCatEvent({ ...base, type: 'TEST' })).toBeNull()
    expect(mapRevenueCatEvent({ ...base, type: 'NON_RENEWING_PURCHASE' })).toBeNull()
    expect(mapRevenueCatEvent({ ...base, type: undefined })).toBeNull()
  })
  it('ignores products that are not Pro (like the Featured listing purchase)', () => {
    expect(mapRevenueCatEvent({ ...base, product_id: 'feature_listing_7day' })).toBeNull()
  })
  it('ignores anonymous RevenueCat users that are not linked to an account', () => {
    expect(mapRevenueCatEvent({ ...base, app_user_id: '$RCAnonymousID:abc' })).toBeNull()
  })
  it('ignores stores it does not recognize', () => {
    expect(mapRevenueCatEvent({ ...base, store: 'STRIPE' })).toBeNull()
  })
})

describe('helpers', () => {
  it('respects an explicit product allow-list', () => {
    expect(isProProduct('my_custom_pro', ['my_custom_pro'])).toBe(true)
    expect(isProProduct('pro_monthly', ['my_custom_pro'])).toBe(false)
  })
  it('validates uuids', () => {
    expect(isUuid(USER)).toBe(true)
    expect(isUuid('not-a-uuid')).toBe(false)
  })
  it('compares secrets exactly', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('stripePeriodEnd', () => {
  it('reads the older layout (period end on the subscription)', () => {
    expect(stripePeriodEnd({ current_period_end: 1000 })).toEqual(new Date(1000 * 1000))
  })
  it('reads the newer layout (period end on the first line item)', () => {
    expect(stripePeriodEnd({ items: { data: [{ current_period_end: 2000 }] } })).toEqual(new Date(2000 * 1000))
  })
  it('returns null when neither is present', () => {
    expect(stripePeriodEnd({})).toBeNull()
  })
})
