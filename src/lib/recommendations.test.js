import { describe, it, expect } from 'vitest'
import { getRecommendedListings } from './recommendations'

function makeListing(overrides) {
  return {
    id: 'l1',
    cuisine: 'Mexican',
    sellerId: 'seller-1',
    available: true,
    unclaimedStoreId: null,
    ...overrides,
  }
}

describe('getRecommendedListings', () => {
  it('returns nothing when the buyer has no favorites', () => {
    const listings = [makeListing({ id: 'a' })]
    expect(getRecommendedListings(listings, new Set(), 'buyer-1')).toEqual({ listings: [], cuisine: null })
  })

  it('recommends other listings in the cuisine the buyer favorites most', () => {
    const listings = [
      makeListing({ id: 'fav-1', cuisine: 'Mexican' }),
      makeListing({ id: 'fav-2', cuisine: 'Mexican' }),
      makeListing({ id: 'rec-1', cuisine: 'Mexican', sellerId: 'seller-2' }),
      makeListing({ id: 'other', cuisine: 'Italian', sellerId: 'seller-3' }),
    ]
    const favoriteIds = new Set(['fav-1', 'fav-2'])
    const result = getRecommendedListings(listings, favoriteIds, 'buyer-1')
    expect(result.cuisine).toBe('Mexican')
    expect(result.listings.map((l) => l.id)).toEqual(['rec-1'])
  })

  it('excludes listings already favorited', () => {
    const listings = [
      makeListing({ id: 'fav-1', cuisine: 'Mexican' }),
      makeListing({ id: 'fav-1-again', cuisine: 'Mexican' }),
    ]
    const favoriteIds = new Set(['fav-1', 'fav-1-again'])
    const result = getRecommendedListings(listings, favoriteIds, 'buyer-1')
    expect(result.listings.map((l) => l.id)).not.toContain('fav-1')
    expect(result.listings.map((l) => l.id)).not.toContain('fav-1-again')
  })

  it("excludes the buyer's own listings even if they match the cuisine", () => {
    const listings = [
      makeListing({ id: 'fav-1', cuisine: 'Mexican' }),
      makeListing({ id: 'own', cuisine: 'Mexican', sellerId: 'buyer-1' }),
    ]
    const result = getRecommendedListings(listings, new Set(['fav-1']), 'buyer-1')
    expect(result.listings.map((l) => l.id)).not.toContain('own')
  })

  it('excludes sold-out and unclaimed-store listings', () => {
    const listings = [
      makeListing({ id: 'fav-1', cuisine: 'Mexican' }),
      makeListing({ id: 'sold-out', cuisine: 'Mexican', sellerId: 'seller-2', available: false }),
      makeListing({ id: 'unclaimed', cuisine: 'Mexican', sellerId: 'seller-3', unclaimedStoreId: 'store-1' }),
    ]
    const result = getRecommendedListings(listings, new Set(['fav-1']), 'buyer-1')
    expect(result.listings).toEqual([])
  })

  it('respects the limit', () => {
    const listings = [
      makeListing({ id: 'fav-1', cuisine: 'Mexican' }),
      ...Array.from({ length: 5 }, (_, i) => makeListing({ id: `rec-${i}`, cuisine: 'Mexican', sellerId: 'seller-2' })),
    ]
    const result = getRecommendedListings(listings, new Set(['fav-1']), 'buyer-1', 3)
    expect(result.listings).toHaveLength(3)
  })

  it('ignores favorited listings with no cuisine set', () => {
    const listings = [makeListing({ id: 'fav-1', cuisine: null })]
    const result = getRecommendedListings(listings, new Set(['fav-1']), 'buyer-1')
    expect(result).toEqual({ listings: [], cuisine: null })
  })
})
