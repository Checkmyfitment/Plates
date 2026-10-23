import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { QA_USER, QA_PROFILE } from './seed.js'

const Ctx = createContext(null)
const params = new URLSearchParams(window.location.search)

// ?role=admin signs in as an admin; ?guest=1 starts signed out
export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(!params.has('guest'))
  const [profile, setProfile] = useState({ ...QA_PROFILE, is_admin: params.get('role') === 'admin' })

  const session = signedIn
    ? { access_token: 'qa-token', user: { id: QA_USER, email: 'qa-tester@example.com', app_metadata: { provider: 'email' } } }
    : null

  const noop = useCallback(async () => ({ error: null }), [])
  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: signedIn ? profile : null,
      loading: false,
      passwordRecovery: false,
      oauthError: '',
      clearOauthError: () => {},
      signInWithSocial: noop,
      signUp: noop,
      signIn: async () => { setSignedIn(true); return { error: null } },
      signOut: async () => { setSignedIn(false) },
      resetPassword: noop,
      updatePassword: noop,
      updateEmail: noop,
      refreshProfile: async () => {},
      _setProfile: setProfile,
    }),
    [signedIn, profile, noop], // eslint-disable-line react-hooks/exhaustive-deps
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  return useContext(Ctx)
}
