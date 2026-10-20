import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument()
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

describe('OrderCard swipe actions', () => {
  it('gives a buyer a visible Message seller button that opens the chat for that order', () => {
    const onMessage = vi.fn()
    render(<OrderCard group={makeGroup()} role="buyer" onUpdateStatus={vi.fn()} onMessage={onMessage} />)
    fireEvent.click(screen.getByRole('button', { name: /Message seller/ }))
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', listingId: 'l1' }))
  })

  it('hides the swipe buttons from screen readers while the card is closed', () => {
    render(<OrderCard group={makeGroup()} role="buyer" onUpdateStatus={vi.fn()} onMessage={vi.fn()} />)
    // only the always-visible buttons are exposed; the swipe copies are aria-hidden
    expect(screen.getAllByRole('button', { name: /Message seller/ })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: /Message seller/, hidden: true })).toHaveLength(2)
  })

  it("the swipe Cancel button opens the same confirmation as the inline one -- it never cancels instantly", () => {
    const onUpdateStatus = vi.fn()
    render(<OrderCard group={makeGroup()} role="buyer" onUpdateStatus={onUpdateStatus} onMessage={vi.fn()} />)
    const [swipeCancel] = screen.getAllByRole('button', { name: 'Cancel order', hidden: true })
    fireEvent.click(swipeCancel)
    expect(screen.getByText("Cancel this order? This can't be undone.")).toBeInTheDocument()
    expect(onUpdateStatus).not.toHaveBeenCalled()
  })

  it('offers "Request cancel" (not an instant cancel) once the seller has confirmed', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'confirmed' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} onMessage={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Cancel order', hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Request cancel/, hidden: true })).toBeInTheDocument()
  })

  it('offers no cancel once the order is ready, only Message', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'ready' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} onMessage={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /cancel/i, hidden: true })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Message seller/ })).toBeInTheDocument()
  })

  it('read-only seller history cards only offer Message buyer', () => {
    render(<OrderCard group={makeGroup()} role="seller" readOnly onMessage={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Message buyer/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cancel/i, hidden: true })).not.toBeInTheDocument()
  })

  it('has no swipe actions at all when nothing can be done', () => {
    const group = makeGroup({ orders: [{ ...makeGroup().orders[0], status: 'completed' }] })
    render(<OrderCard group={group} role="buyer" onUpdateStatus={vi.fn()} />)
    expect(screen.queryByRole('button', { hidden: true, name: /Message|cancel/i })).not.toBeInTheDocument()
  })
})
