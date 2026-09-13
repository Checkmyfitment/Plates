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

  it('offers a cancellation *request* for a confirmed order, not an instant cancel', () => {
    // the seller may have already started preparing a confirmed order, so
    // this doesn't cancel outright — it needs the seller's approval
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'confirmed' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Request to cancel')).toBeInTheDocument()
    expect(screen.queryByText('Cancel order')).not.toBeInTheDocument()
  })

  it('shows seller Confirm/Cancel actions on a pending order', () => {
    render(<OrderCard group={makeGroup()} role="seller" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('shows the seller Approve/Keep actions once a buyer has requested cancellation', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'cancel_requested' }] })
    render(
      <OrderCard
        group={group}
        role="seller"
        onUpdateStatus={vi.fn()}
        onApproveCancellation={vi.fn()}
        onDeclineCancellation={vi.fn()}
      />,
    )
    expect(screen.getByText('Cancellation requested')).toBeInTheDocument()
    expect(screen.getByText('Approve cancellation')).toBeInTheDocument()
    expect(screen.getByText('Keep order')).toBeInTheDocument()
  })

  it('gives a buyer no cancel-related action while a request is already pending', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'cancel_requested' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.queryByText('Cancel order')).not.toBeInTheDocument()
    expect(screen.queryByText('Request to cancel')).not.toBeInTheDocument()
  })

  it('lets a seller start preparing a confirmed order, then mark it ready', () => {
    const confirmed = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'confirmed' }] })
    const { rerender } = render(<OrderCard group={confirmed} role="seller" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Start preparing')).toBeInTheDocument()

    const preparing = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'preparing' }] })
    rerender(<OrderCard group={preparing} role="seller" onUpdateStatus={vi.fn()} />)
    // "Preparing" appears twice — once as the status pill, once as the
    // tracker's current step label — so just confirm it's there at all
    expect(screen.getAllByText('Preparing').length).toBeGreaterThan(0)
    expect(screen.getByText('Mark ready')).toBeInTheDocument()
  })

  it('lets a buyer request cancellation while an order is preparing, not just confirmed', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'preparing' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByText('Request to cancel')).toBeInTheDocument()
  })

  it('shows a progress tracker for an active order, but not a cancelled one', () => {
    const preparing = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'preparing' }] })
    const { rerender } = render(<OrderCard group={preparing} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByLabelText('Order status: Preparing')).toBeInTheDocument()

    const cancelled = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'cancelled' }] })
    rerender(<OrderCard group={cancelled} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.queryByLabelText(/Order status:/)).not.toBeInTheDocument()
  })

  it("labels the tracker's last two steps for delivery instead of pickup", () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'ready', fulfillmentMethod: 'delivery' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.getByLabelText('Order status: Out for delivery')).toBeInTheDocument()
  })

  it('offers "Order again" for a completed order only when onReorder is provided', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'completed' }] })
    const { rerender } = render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.queryByText('Order again')).not.toBeInTheDocument()

    rerender(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} onReorder={vi.fn()} />)
    expect(screen.getByText('Order again')).toBeInTheDocument()
  })
})
