import { describe, it, expect } from 'vitest'
import { summarizeStandingOrdersByListing } from './subscriptions'

function makeStanding(overrides) {
  return {
    id: 'sub-1',
    listingId: 'listing-1',
    listingTitle: 'Tamales',
    buyerName: 'A neighbor',
    quantity: 1,
    intervalDays: 7,
    nextOrderDate: '2026-09-05',
    ...overrides,
  }
}

describe('summarizeStandingOrdersByListing', () => {
  it('returns an empty array for no standing orders', () => {
    expect(summarizeStandingOrdersByListing([])).toEqual([])
  })

  it('rolls up subscriber count and total quantity per listing', () => {
    const rows = [
      makeStanding({ id: 's1', quantity: 2 }),
      makeStanding({ id: 's2', quantity: 3 }),
    ]
    const result = summarizeStandingOrdersByListing(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      listingId: 'listing-1',
      listingTitle: 'Tamales',
      subscriberCount: 2,
      totalQuantity: 5,
    })
  })

  it('keeps separate listings separate', () => {
    const rows = [
      makeStanding({ id: 's1', listingId: 'listing-1', listingTitle: 'Tamales' }),
      makeStanding({ id: 's2', listingId: 'listing-2', listingTitle: 'Meal prep box' }),
    ]
    const result = summarizeStandingOrdersByListing(rows)
    expect(result).toHaveLength(2)
  })

  it('takes the soonest next_order_date across subscribers of the same listing', () => {
    const rows = [
      makeStanding({ id: 's1', nextOrderDate: '2026-09-12' }),
      makeStanding({ id: 's2', nextOrderDate: '2026-09-05' }),
      makeStanding({ id: 's3', nextOrderDate: '2026-09-19' }),
    ]
    const result = summarizeStandingOrdersByListing(rows)
    expect(result[0].nextOrderDate).toBe('2026-09-05')
  })

  it('sorts listings by soonest next order date', () => {
    const rows = [
      makeStanding({ id: 's1', listingId: 'listing-1', listingTitle: 'Tamales', nextOrderDate: '2026-09-19' }),
      makeStanding({ id: 's2', listingId: 'listing-2', listingTitle: 'Meal prep box', nextOrderDate: '2026-09-05' }),
    ]
    const result = summarizeStandingOrdersByListing(rows)
    expect(result.map((r) => r.listingTitle)).toEqual(['Meal prep box', 'Tamales'])
  })
})
