import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import WhatsCookingThisWeek from './WhatsCookingThisWeek'

function makeListing(overrides) {
  return {
    id: 'l1',
    title: 'Chicken tamales',
    seller: 'Sam',
    price: 12,
    photo: '🍽️',
    bg: 'var(--paper-dim)',
    available: true,
    unclaimedStoreId: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

describe('WhatsCookingThisWeek', () => {
  it('renders nothing when nothing was posted in the last 7 days', () => {
    const old = makeListing({ id: 'old', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() })
    const { container } = render(<WhatsCookingThisWeek listings={[old]} onSelect={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a listing posted within the last 7 days', () => {
    const fresh = makeListing({ id: 'fresh', title: 'Fresh dumplings' })
    render(<WhatsCookingThisWeek listings={[fresh]} onSelect={vi.fn()} />)
    expect(screen.getByText('Fresh dumplings')).toBeInTheDocument()
  })

  it('excludes sold-out and unclaimed-store listings', () => {
    const soldOut = makeListing({ id: 'sold', title: 'Sold out soup', available: false })
    const unclaimed = makeListing({ id: 'unclaimed', title: 'Unclaimed store item', unclaimedStoreId: 'store-1' })
    render(<WhatsCookingThisWeek listings={[soldOut, unclaimed]} onSelect={vi.fn()} />)
    expect(screen.queryByText('Sold out soup')).not.toBeInTheDocument()
    expect(screen.queryByText('Unclaimed store item')).not.toBeInTheDocument()
  })

  it('sorts newest first', () => {
    const older = makeListing({ id: 'a', title: 'Older dish', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() })
    const newer = makeListing({ id: 'b', title: 'Newer dish', createdAt: new Date(Date.now() - 1 * 86400000).toISOString() })
    render(<WhatsCookingThisWeek listings={[older, newer]} onSelect={vi.fn()} />)
    const titles = screen.getAllByText(/dish/).map((el) => el.textContent)
    expect(titles[0]).toBe('Newer dish')
    expect(titles[1]).toBe('Older dish')
  })
})
