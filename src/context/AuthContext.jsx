import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)

  const loadProfile = async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error) console.error('Failed to load profile', error)
    setProfile(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      loadProfile(session?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      loadProfile(session?.user?.id)
      // fired when someone lands back here from a password-reset email link
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, name, referredBy, signupIntent, captchaToken) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, referred_by: referredBy || null, signup_intent: signupIntent || null },
        captchaToken,
      },
    })
  }

  const signIn = async (email, password, captchaToken) => {
    return supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
  }

  const signOut = () => {
    setPasswordRecovery(false)
    return supabase.auth.signOut()
  }

  const resetPassword = (email, captchaToken) =>
    supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin, captchaToken })

  const updatePassword = async (password) => {
    const result = await supabase.auth.updateUser({ password })
    if (!result.error) setPasswordRecovery(false)
    return result
  }

  // Supabase emails a confirmation link to the new address before the
  // change actually takes effect — the account keeps signing in with the
  // old email until that link is clicked
  const updateEmail = (email) => supabase.auth.updateUser({ email })

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    passwordRecovery,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateEmail,
    refreshProfile: () => loadProfile(session?.user?.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
