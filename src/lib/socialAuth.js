import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { createClient } from '@supabase/supabase-js'
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient'

export const NATIVE_REDIRECT = 'com.platesapp.app://auth-callback'
const PKCE_STORAGE_KEY = 'plates-oauth-pkce'

// A second client used only to start/finish a native OAuth round-trip. It runs
// PKCE so a malicious app registering the same custom URL scheme can't redeem
// the code. The main client stays on its default flow because email
// confirmation and password-reset links are often opened in a different
// browser than the one that started them, which PKCE can't handle.
let pkceClient
function getPkceClient() {
  if (!pkceClient) {
    pkceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        storageKey: PKCE_STORAGE_KEY,
        detectSessionInUrl: false,
        autoRefreshToken: false,
      },
    })
  }
  return pkceClient
}

// signOut({ scope: 'local' }) would revoke the session we just handed to the
// main client, so clear this client's stored copy by hand instead
function clearPkceStorage() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith(PKCE_STORAGE_KEY))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // ignore
  }
}

const providerOptions = (provider) =>
  provider === 'google' ? { queryParams: { prompt: 'select_account' } } : { scopes: 'name email' }

export async function signInWithProvider(provider) {
  if (!Capacitor.isNativePlatform()) {
    return supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin, ...providerOptions(provider) },
    })
  }
  const { data, error } = await getPkceClient().auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true, ...providerOptions(provider) },
  })
  if (error) return { error }
  await Browser.open({ url: data.url })
  return { error: null }
}

// Called when the OS hands the app a com.platesapp.app://auth-callback link
// after the browser sign-in finishes. Returns { error } only for links that
// were ours; null for anything else.
export async function handleAuthDeepLink(url) {
  if (!url || !url.startsWith(NATIVE_REDIRECT)) return null
  await Browser.close().catch(() => {})
  const parsed = new URL(url)
  const code = parsed.searchParams.get('code')
  if (!code) {
    const reason = parsed.searchParams.get('error_description')
    return { error: new Error(reason || 'Sign-in was cancelled.') }
  }
  const client = getPkceClient()
  const { data, error } = await client.auth.exchangeCodeForSession(code)
  if (error || !data?.session) {
    clearPkceStorage()
    return { error: error || new Error('Sign-in failed. Please try again.') }
  }
  const { error: setError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  })
  clearPkceStorage()
  return { error: setError }
}
