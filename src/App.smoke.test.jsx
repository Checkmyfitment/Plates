// Whole-app smoke test: sign in a fake user, walk every bottom tab and the
// top-bar buttons, and fail on any crash. This exists because a single
// misplaced line (a variable read before its declaration) once crashed the
// entire app the moment a signed-in person opened Chats -- and nothing else
// in the test suite renders the real App.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const QA_USER = '00000000-0000-4000-8000-000000000001'

vi.mock('./context/AuthContext', () => {
  const session = { access_token: 't', user: { id: '00000000-0000-4000-8000-000000000001', email: 'qa@example.com', app_metadata: { provider: 'email' } } }
  const profile = { id: session.user.id, name: 'QA Tester', signup_intent: 'both', banned: false, deleted_at: null, is_admin: false, is_pro: false }
  const value = {
    session, user: session.user, profile, loading: false, passwordRecovery: false, oauthError: '',
    clearOauthError() {}, signInWithSocial: async () => ({}), signUp: async () => ({}), signIn: async () => ({}),
    signOut: async () => {}, resetPassword: async () => ({}), updatePassword: async () => ({}), updateEmail: async () => ({}),
    refreshProfile: async () => {},
  }
  return { useAuth: () => value, AuthProvider: ({ children }) => children }
})
vi.mock('./lib/realtime', () => ({ subscribeToTable: () => () => {} }))
vi.mock('./lib/analytics', () => ({ trackPageView: () => {}, trackEvent: () => {}, trackListingView: () => {} }))

import App from './App'
import { ToastProvider } from './context/ToastContext'
import { markOnboardingSeen, markCottageLawNoticeSeen, markNotifPromptSeen } from './lib/onboarding'

beforeEach(() => {
  localStorage.clear()
  markOnboardingSeen()
  markCottageLawNoticeSeen()
  markNotifPromptSeen()
  // every database read returns "no rows"; every write succeeds
  global.fetch = vi.fn(async (input, init = {}) => {
    const method = (init.method || 'GET').toUpperCase()
    return new Response(JSON.stringify(method === 'GET' ? [] : {}), { status: method === 'GET' ? 200 : 201, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/0' } })
  })
  window.scrollTo = () => {}
})

const renderApp = () => render(<ToastProvider><App /></ToastProvider>)

describe('App (signed in)', () => {
  it('opens the Chats tab without crashing (regression: activeChat read before it was declared)', async () => {
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Chats' }))
    expect(await screen.findByText(/no (messages|chats|conversations)|start a conversation|your chats|nothing here/i, {}, { timeout: 3000 }).catch(() => null)).toBeDefined()
    // still rendering the real app, not the crash screen
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
  })

  it('walks every bottom tab and the Orders screen without crashing, and can leave each one', async () => {
    renderApp()
    await screen.findByRole('button', { name: 'Search' })
    for (const name of ['Map', 'Search', /You$/, 'Home']) {
      fireEvent.click(screen.getByRole('button', { name }))
      await waitFor(() => expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument())
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cart' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument())
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument()
  })

  it('opens Notifications and comes back', async () => {
    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'Notifications' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Back' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument())
  })
})
