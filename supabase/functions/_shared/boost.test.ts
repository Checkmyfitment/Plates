import { describe, it, expect } from 'vitest'
import { findPurchase } from './boost'

const data = {
  feature_listing_7day: [
    { id: 'rc-abc', store_transaction_id: 'apple-123', store: 'app_store' },
    { id: 'rc-def', store_transaction_id: 'apple-456', store: 'app_store' },
  ],
  other_product: [{ id: 'rc-xyz', store_transaction_id: 'play-789', store: 'play_store' }],
}

describe('findPurchase', () => {
  it("matches the store's own transaction id (what the app sends)", () => {
    expect(findPurchase(data, 'apple-456')?.id).toBe('rc-def')
    expect(findPurchase(data, 'play-789')?.id).toBe('rc-xyz')
  })
  it("still matches RevenueCat's own id", () => {
    expect(findPurchase(data, 'rc-abc')?.store_transaction_id).toBe('apple-123')
  })
  it('does not match a transaction that was never made', () => {
    expect(findPurchase(data, 'apple-999')).toBeUndefined()
  })
  it('handles an empty or missing purchase history', () => {
    expect(findPurchase({}, 'x')).toBeUndefined()
    expect(findPurchase(undefined, 'x')).toBeUndefined()
    expect(findPurchase(data, '')).toBeUndefined()
  })
})
