import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const signInWithSocial = vi.fn()
const clearOauthError = vi.fn()
let oauthError = ''

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signUp: vi.fn(),
    resetPassword: vi.fn(),
    signInWithSocial,
    oauthError,
    clearOauthError,
  }),
}))
vi.mock('./TurnstileWidget', () => ({ default: () => null }))

import AuthScreen from './AuthScreen'

describe('AuthScreen social sign-in', () => {
  beforeEach(() => {
    signInWithSocial.mockReset().mockResolvedValue({ error: null })
    clearOauthError.mockReset()
    oauthError = ''
  })

  it('offers Google and Apple on the log-in screen', () => {
    render(<AuthScreen />)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    expect(screen.getByText('Continue with Apple')).toBeInTheDocument()
  })

  it('starts the matching provider when a button is tapped', async () => {
    render(<AuthScreen />)
    fireEvent.click(screen.getByText('Continue with Google'))
    await waitFor(() => expect(signInWithSocial).toHaveBeenCalledWith('google'))
    fireEvent.click(screen.getByText('Continue with Apple'))
    await waitFor(() => expect(signInWithSocial).toHaveBeenCalledWith('apple'))
  })

  it('shows an error if starting the sign-in fails', async () => {
    signInWithSocial.mockResolvedValue({ error: { message: 'Provider is not enabled' } })
    render(<AuthScreen />)
    fireEvent.click(screen.getByText('Continue with Apple'))
    expect(await screen.findByText('Provider is not enabled')).toBeInTheDocument()
  })

  it('shows an error that came back from the native browser round-trip', () => {
    oauthError = 'Sign-in was cancelled.'
    render(<AuthScreen />)
    expect(screen.getByText('Sign-in was cancelled.')).toBeInTheDocument()
  })

  it('hides the social buttons on the password-reset screen', () => {
    render(<AuthScreen />)
    fireEvent.click(screen.getByText('Forgot password?'))
    expect(screen.queryByText('Continue with Google')).not.toBeInTheDocument()
  })
})
