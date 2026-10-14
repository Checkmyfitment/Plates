import { describe, it, expect, vi, beforeEach } from 'vitest'

const { exchangeCodeForSession, browserClose, setSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  browserClose: vi.fn(),
  setSession: vi.fn(),
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: vi.fn(), close: browserClose } }))
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { exchangeCodeForSession, signInWithOAuth: vi.fn() } }),
}))
vi.mock('./supabaseClient', () => ({
  supabase: { auth: { setSession } },
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon',
}))

import { handleAuthDeepLink, NATIVE_REDIRECT } from './socialAuth'

describe('handleAuthDeepLink', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    setSession.mockReset().mockResolvedValue({ error: null })
    browserClose.mockReset().mockResolvedValue()
  })

  it('ignores links that are not the auth callback', async () => {
    expect(await handleAuthDeepLink('https://passtheplates.app/?ref=abc')).toBeNull()
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('swaps the code for a session and hands it to the main client', async () => {
    exchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: 'a', refresh_token: 'r' } },
      error: null,
    })
    const result = await handleAuthDeepLink(`${NATIVE_REDIRECT}?code=abc123`)
    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(setSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' })
    expect(browserClose).toHaveBeenCalled()
    expect(result.error).toBeNull()
  })

  it('reports the provider error when the user cancels or it fails', async () => {
    const result = await handleAuthDeepLink(`${NATIVE_REDIRECT}?error=access_denied&error_description=User+cancelled`)
    expect(result.error.message).toBe('User cancelled')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('reports a failed code exchange without setting a session', async () => {
    exchangeCodeForSession.mockResolvedValue({ data: null, error: new Error('bad code') })
    const result = await handleAuthDeepLink(`${NATIVE_REDIRECT}?code=zzz`)
    expect(result.error.message).toBe('bad code')
    expect(setSession).not.toHaveBeenCalled()
  })
})
