import { describe, it, expect } from 'vitest'
import { getSellerBadge } from './badges'

describe('getSellerBadge', () => {
  it('shows "New neighbor" when there are no ratings at all', () => {
    expect(getSellerBadge(null)).toEqual({ icon: '🌱', label: 'New neighbor' })
    expect(getSellerBadge({ avgRating: 0, reviewCount: 0 })).toEqual({ icon: '🌱', label: 'New neighbor' })
  })

  it('shows "Community favorite" at 4.8+ average with 5+ reviews', () => {
    expect(getSellerBadge({ avgRating: 4.8, reviewCount: 5 })).toEqual({ icon: '🌟', label: 'Community favorite' })
    expect(getSellerBadge({ avgRating: 5, reviewCount: 12 })).toEqual({ icon: '🌟', label: 'Community favorite' })
  })

  it('shows no badge for an established seller below the favorite threshold', () => {
    expect(getSellerBadge({ avgRating: 4.2, reviewCount: 8 })).toBeNull()
    expect(getSellerBadge({ avgRating: 4.9, reviewCount: 2 })).toBeNull()
  })
})
