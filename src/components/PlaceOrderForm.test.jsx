import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PlaceOrderForm from './PlaceOrderForm'

describe('PlaceOrderForm', () => {
  it('shows the order total for the default quantity', () => {
    render(<PlaceOrderForm price={5} onSubmit={vi.fn()} />)
    expect(screen.getByText('Place order — $5.00')).toBeInTheDocument()
  })

  // regression test for a real bug found this session: two rapid clicks
  // both read the same pre-update `submitting` state (React doesn't commit
  // synchronously), so a useState guard alone let a double-click place two
  // orders. Fixed with a useRef checked/set synchronously before the state.
  it('only calls onSubmit once for two rapid clicks on the same tick', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<PlaceOrderForm price={5} onSubmit={onSubmit} />)
    const button = screen.getByText('Place order — $5.00')
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('blocks submission below the seller-set minimum order amount', () => {
    const onSubmit = vi.fn()
    render(<PlaceOrderForm price={5} onSubmit={onSubmit} minOrderAmount={15} />)
    expect(screen.getByText('$15.00 minimum order — add 2 more')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Place order — $5.00'))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('blocks delivery orders until an address is entered', () => {
    const onSubmit = vi.fn()
    render(<PlaceOrderForm price={5} onSubmit={onSubmit} deliveryAvailable />)
    fireEvent.click(screen.getByText('delivery'))
    fireEvent.click(screen.getByText('Place order — $5.00'))
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('Delivery address'), { target: { value: '123 Main St' } })
    fireEvent.click(screen.getByText('Place order — $5.00'))
    expect(onSubmit).toHaveBeenCalledWith(1, '', 'delivery', '123 Main St', null)
  })
})
