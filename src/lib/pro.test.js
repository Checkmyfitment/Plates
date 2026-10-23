import { describe, it, expect, vi } from 'vitest'

vi.mock('@revenuecat/purchases-capacitor', () => ({ Purchases: {} }))
vi.mock('./iap', () => ({ isNativeIAPSupported: () => false, ensureIAPConfigured: async () => {} }))
vi.mock('./supabaseClient', () => ({ supabase: {}, SUPABASE_URL: 'https://example.supabase.co' }))

const { getProOffer } = await import('./pro')

describe('getProOffer', () => {
  it('keeps the manual "message us" flow on the web until payments are live', () => {
    expect(getProOffer({ platform: 'web', live: false, nativeIAP: false })).toBe('request')
  })
  it('hides the upgrade card in the native apps until payments are live (no steering to outside payment)', () => {
    expect(getProOffer({ platform: 'ios', live: false, nativeIAP: true })).toBe('hidden')
    expect(getProOffer({ platform: 'android', live: false, nativeIAP: true })).toBe('hidden')
  })
  it('lets people buy on the web once live', () => {
    expect(getProOffer({ platform: 'web', live: true, nativeIAP: false })).toBe('buy')
  })
  it('lets people buy in the native app once live and the store purchase is configured', () => {
    expect(getProOffer({ platform: 'ios', live: true, nativeIAP: true })).toBe('buy')
  })
  it('stays hidden in a native build that has no store purchase configured, even when live', () => {
    expect(getProOffer({ platform: 'android', live: true, nativeIAP: false })).toBe('hidden')
  })
})
