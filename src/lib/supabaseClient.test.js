import { describe, it, expect, beforeEach } from 'vitest'
import { authStorage, setRememberMe } from './supabaseClient'

describe('remember me / auth storage', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('defaults to localStorage (remembered) when no preference has been set yet', () => {
    authStorage.setItem('sb-test-auth-token', 'session-a')
    expect(localStorage.getItem('sb-test-auth-token')).toBe('session-a')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('writes to localStorage when remembered', () => {
    setRememberMe(true)
    authStorage.setItem('sb-test-auth-token', 'session-b')
    expect(localStorage.getItem('sb-test-auth-token')).toBe('session-b')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('writes to sessionStorage instead when not remembered', () => {
    setRememberMe(false)
    authStorage.setItem('sb-test-auth-token', 'session-c')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBe('session-c')
    expect(localStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('reads back from whichever store matches the current preference', () => {
    setRememberMe(false)
    authStorage.setItem('sb-test-auth-token', 'session-d')
    expect(authStorage.getItem('sb-test-auth-token')).toBe('session-d')

    setRememberMe(true)
    // switching the preference doesn't retroactively move an already-written
    // session -- a fresh getItem() call now looks in localStorage instead,
    // so the sessionStorage-held session becomes invisible to it
    expect(authStorage.getItem('sb-test-auth-token')).toBeNull()
  })

  it('removes from whichever store matches the current preference', () => {
    setRememberMe(false)
    authStorage.setItem('sb-test-auth-token', 'session-e')
    authStorage.removeItem('sb-test-auth-token')
    expect(sessionStorage.getItem('sb-test-auth-token')).toBeNull()
  })
})
