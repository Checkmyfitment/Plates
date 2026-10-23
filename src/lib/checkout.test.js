import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./supabaseClient', () => ({
  SUPABASE_URL: 'https://example.supabase.co',
  supabase: { auth: { getSession: async () => ({ data: { session: { access_token: 'user-jwt' } } }) } },
}))

const { startFeaturedListingCheckout } = await import('./checkout')

beforeEach(() => {
  delete window.location
  window.location = { href: 'https://www.passtheplates.app/' }
})

describe('startFeaturedListingCheckout', () => {
  it("calls the checkout function with the signed-in user's token and sends them to Stripe", async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ url: 'https://checkout.stripe.com/pay/abc' }) }))
    await startFeaturedListingCheckout('listing-1')
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('https://example.supabase.co/functions/v1/create-checkout-session')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer user-jwt')
    expect(JSON.parse(init.body)).toEqual({ listing_id: 'listing-1' })
    expect(window.location.href).toBe('https://checkout.stripe.com/pay/abc')
  })

  it('surfaces the server error instead of leaving the page', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'not your listing' }) }))
    await expect(startFeaturedListingCheckout('listing-1')).rejects.toThrow('not your listing')
    expect(window.location.href).toBe('https://www.passtheplates.app/')
  })

  it('falls back to a friendly message when the server gives no detail', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, json: async () => { throw new Error('bad json') } }))
    await expect(startFeaturedListingCheckout('listing-1')).rejects.toThrow('Could not start checkout')
  })
})
