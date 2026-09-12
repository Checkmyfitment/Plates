import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ListingCard from './ListingCard'

function makeListing(overrides) {
  return {
    id: 'l1',
    title: 'Chicken tamales',
    seller: 'Sam Whitfield',
    price: 12,
    photo: '🍽️',
    bg: 'var(--paper-dim)',
    ...overrides,
  }
}

describe('ListingCard', () => {
  it('shows no rating badge when the seller has no reviews yet', () => {
    render(<ListingCard listing={makeListing()} onSelect={vi.fn()} />)
    expect(screen.queryByText(/★/)).not.toBeInTheDocument()
  })

  it("shows the seller's average rating when they have one", () => {
    render(<ListingCard listing={makeListing({ sellerAvgRating: 4.8, sellerReviewCount: 12 })} onSelect={vi.fn()} />)
    expect(screen.getByText('★ 4.8')).toBeInTheDocument()
  })

  it('offers no quick-order shortcut unless onQuickOrder is provided', () => {
    render(<ListingCard listing={makeListing()} onSelect={vi.fn()} />)
    expect(screen.queryByText('Order')).not.toBeInTheDocument()
  })

  it('calls onQuickOrder (not onSelect) when the Order shortcut is tapped', () => {
    const onSelect = vi.fn()
    const onQuickOrder = vi.fn()
    const listing = makeListing()
    render(<ListingCard listing={listing} onSelect={onSelect} onQuickOrder={onQuickOrder} />)

    fireEvent.click(screen.getByText('Order'))
    expect(onQuickOrder).toHaveBeenCalledWith(listing)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('hides the quick-order shortcut once a listing is sold out', () => {
    render(<ListingCard listing={makeListing({ available: false })} onSelect={vi.fn()} onQuickOrder={vi.fn()} />)
    expect(screen.queryByText('Order')).not.toBeInTheDocument()
  })
})
