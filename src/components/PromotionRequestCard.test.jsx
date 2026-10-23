import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const m = vi.hoisted(() => ({
  native: false,
  iap: true,
  live: true,
  checkout: vi.fn(async () => {}),
  purchase: vi.fn(async () => {}),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => m.native } }))
vi.mock('../lib/iap', () => ({ isNativeIAPSupported: () => m.iap, purchaseFeaturedListing: (...a) => m.purchase(...a) }))
vi.mock('../lib/checkout', () => ({ startFeaturedListingCheckout: (...a) => m.checkout(...a) }))
vi.mock('../lib/promotions', () => ({ requestPromotion: vi.fn(), fetchMyPromotionRequest: async () => null }))
vi.mock('../lib/siteInfo', () => ({ get PAID_BOOSTS_LIVE() { return m.live } }))
vi.mock('../context/ToastContext', () => ({ useToast: () => m.toast }))

import PromotionRequestCard from './PromotionRequestCard'

const props = { listingId: 'l1', sellerId: 'u1', featured: false, featuredUntil: null }

beforeEach(() => {
  m.native = false
  m.iap = true
  m.live = true
  Object.values(m.toast).forEach((f) => f.mockClear())
  m.checkout.mockClear()
  m.purchase.mockClear()
})

describe('PromotionRequestCard', () => {
  it('on the web, the buy button sends the seller to Stripe Checkout for that listing', async () => {
    render(<PromotionRequestCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Feature this listing — \$4\.99/ }))
    await waitFor(() => expect(m.checkout).toHaveBeenCalledWith('l1'))
    expect(m.purchase).not.toHaveBeenCalled()
  })

  it('in the phone app, it buys through the store and then tells the screen to refresh', async () => {
    m.native = true
    const onBoosted = vi.fn()
    render(<PromotionRequestCard {...props} onBoosted={onBoosted} />)
    fireEvent.click(screen.getByRole('button', { name: /Feature this listing/ }))
    await waitFor(() => expect(m.purchase).toHaveBeenCalledWith('l1'))
    await waitFor(() => expect(onBoosted).toHaveBeenCalledTimes(1))
    expect(m.checkout).not.toHaveBeenCalled()
  })

  it('does not refresh or celebrate when the store purchase fails', async () => {
    m.native = true
    m.purchase.mockRejectedValueOnce(new Error('Purchase succeeded but could not be applied — contact support.'))
    const onBoosted = vi.fn()
    render(<PromotionRequestCard {...props} onBoosted={onBoosted} />)
    fireEvent.click(screen.getByRole('button', { name: /Feature this listing/ }))
    await waitFor(() => expect(m.toast.error).toHaveBeenCalled())
    expect(onBoosted).not.toHaveBeenCalled()
    expect(m.toast.success).not.toHaveBeenCalled()
  })

  it('stays quiet when the buyer just cancels the store sheet', async () => {
    m.native = true
    m.purchase.mockRejectedValueOnce(new Error('Purchase was cancelled'))
    render(<PromotionRequestCard {...props} />)
    fireEvent.click(screen.getByRole('button', { name: /Feature this listing/ }))
    await waitFor(() => expect(m.purchase).toHaveBeenCalled())
    expect(m.toast.error).not.toHaveBeenCalled()
  })

  it('shows the paid-through date instead of a buy button once featured', () => {
    render(<PromotionRequestCard {...props} featured featuredUntil="2026-11-01T12:00:00Z" />)
    expect(screen.getByText(/Featured until/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps the original "request it" flow while payments are not live', async () => {
    m.live = false
    render(<PromotionRequestCard {...props} />)
    expect(await screen.findByRole('button', { name: 'Request to be featured' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /\$4\.99/ })).not.toBeInTheDocument()
  })

  it('shows nothing in a phone build with no store purchase configured (no outside-the-app billing)', async () => {
    m.native = true
    m.iap = false
    const { container } = render(<PromotionRequestCard {...props} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows nothing in the phone app while payments are not live', async () => {
    m.native = true
    m.live = false
    const { container } = render(<PromotionRequestCard {...props} />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
