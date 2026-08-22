import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderCard from './OrderCard'

function makeGroup(overrides) {
  return {
    groupId: 'g1',
    cartId: null,
    orders: [
      {
        id: 'o1',
        listingId: 'l1',
        listingTitle: 'Chicken tamales',
        buyerName: 'Order Test Buyer',
        sellerName: 'Order Test Seller',
        quantity: 2,
        priceAtOrder: 5,
        status: 'pending',
        createdAt: new Date().toISOString(),
        note: null,
      },
    ],
    ...overrides,
  }
}

describe('OrderCard', () => {
  it('shows the item, total, and status label', () => {
    render(<OrderCard group={makeGroup()} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('2x Chicken tamales')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('lets a buyer cancel a pending order but not a seller-only action', () => {
    render(<OrderCard group={makeGroup()} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Cancel order')).toBeInTheDocument()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('lets a buyer cancel a confirmed order too, not just pending', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'confirmed' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Cancel order')).toBeInTheDocument()
  })

  it('shows seller Confirm/Cancel actions on a pending order', () => {
    render(<OrderCard group={makeGroup()} role="seller" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('offers "Order again" for a completed order only when onReorder is provided', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'completed' }] })
    const { rerender } = render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.queryByText('Order again')).not.toBeInTheDocument()

    rerender(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} onReorder={vi.fn()} />)
    expect(screen.getByText('Order again')).toBeInTheDocument()
  })
})
