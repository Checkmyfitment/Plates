import { describe, it, expect } from 'vitest'
import { getSellerBadge, getReferralBadge, hasCottageLawConfirmed } from './badges'

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

  it('prefers "Top rated" over "Community favorite" when both would apply', () => {
    const rating = { avgRating: 5, reviewCount: 10 }
    const trust = { isTopRated: true }
    expect(getSellerBadge(rating, trust)).toEqual({ icon: '🏆', label: 'Top rated' })
  })

  it('does not show "Top rated" just because a rating is high — needs the real track record', () => {
    const rating = { avgRating: 5, reviewCount: 10 }
    const trust = { isTopRated: false }
    expect(getSellerBadge(rating, trust)).toEqual({ icon: '🌟', label: 'Community favorite' })
  })
})

describe('getReferralBadge', () => {
  it('requires at least 3 referrals', () => {
    expect(getReferralBadge(0)).toBeNull()
    expect(getReferralBadge(2)).toBeNull()
    expect(getReferralBadge(3)).toEqual({ icon: '🎉', label: 'Community Builder' })
    expect(getReferralBadge(10)).toEqual({ icon: '🎉', label: 'Community Builder' })
  })
})

describe('hasCottageLawConfirmed', () => {
  it('is false for a seller with no listings at all', () => {
    expect(hasCottageLawConfirmed([])).toBe(false)
  })

  it('is false if even one listing has not confirmed', () => {
    const listings = [{ cottageLawConfirmed: true }, { cottageLawConfirmed: false }]
    expect(hasCottageLawConfirmed(listings)).toBe(false)
  })

  it('is true only when every listing has confirmed', () => {
    const listings = [{ cottageLawConfirmed: true }, { cottageLawConfirmed: true }]
    expect(hasCottageLawConfirmed(listings)).toBe(true)
  })
})
