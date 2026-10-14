import { useState, lazy, Suspense } from 'react'
import { Capacitor } from '@capacitor/core'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import TurnstileWidget from './TurnstileWidget'
import { savePendingClaim } from '../lib/stores'
import { setRememberMe } from '../lib/supabaseClient'

// Cloudflare Turnstile cannot complete its challenge inside Capacitor's iOS
// WebView -- confirmed via Cloudflare's own widget analytics (0 of 168
// challenges solved across both the Simulator and two signed TestFlight
// builds, in both Managed and Invisible mode). That's a platform limitation,
// not a config bug, so on native we skip requiring it rather than lock every
// real user out of their own app. It still runs (and is still required) on
// the web app, where it works fine.
const isNative = Capacitor.isNativePlatform()
// Apple's guidelines want Sign in with Apple at least as prominent as other
// providers; lead with it on iPhone, with Google first everywhere else
const appleFirst = Capacitor.getPlatform() === 'ios'

// most people who land on this screen never tap Terms/Privacy — no reason
// to make every guest download it upfront
const LegalScreen = lazy(() => import('./LegalScreen'))

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.62c-.03-2.74 2.24-4.06 2.34-4.12-1.28-1.87-3.26-2.12-3.97-2.15-1.69-.17-3.3.99-4.16.99-.86 0-2.18-.97-3.58-.94-1.84.03-3.54 1.07-4.49 2.72-1.91 3.31-.49 8.22 1.37 10.9.91 1.31 2 2.78 3.42 2.73 1.37-.05 1.89-.89 3.55-.89 1.66 0 2.13.89 3.58.86 1.48-.03 2.41-1.34 3.31-2.66 1.04-1.52 1.47-3 1.49-3.07-.03-.01-2.85-1.09-2.88-4.37zM13.65 4.5c.76-.92 1.27-2.2 1.13-3.47-1.09.04-2.4.73-3.18 1.64-.7.81-1.31 2.1-1.15 3.34 1.21.09 2.44-.62 3.2-1.51z" />
    </svg>
  )
}

export default function AuthScreen({ onClose, reason, onSignedUp }) {
  const { signIn, signUp, resetPassword, signInWithSocial, oauthError, clearOauthError } = useAuth()
  const [referredBy] = useState(() => new URLSearchParams(window.location.search).get('ref') || null)
  const [claimCode] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('claim') || null
    // save now — if email confirmation is on, the user leaves for their inbox
    // and the ?claim= param on this page won't be there when they come back
    if (code) savePendingClaim(code)
    return code
  })
  const [mode, setMode] = useState(referredBy || claimCode ? 'signup' : 'signin') // signin | signup | reset
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [remember, setRemember] = useState(true)
  const [intent, setIntent] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null)
  const [captchaToken, setCaptchaToken] = useState(null)

  const socialSignIn = async (provider) => {
    setError('')
    setNotice('')
    clearOauthError()
    setBusy(true)
    const { error } = await signInWithSocial(provider)
    if (error) setError(error.message)
    // on web the page is about to redirect; on native the system browser is
    // opening -- either way, let the buttons be tappable again
    setBusy(false)
  }

  const switchMode = (next) => {
    setMode(next)
    setError('')
    clearOauthError()
    setNotice('')
    // a Turnstile token is single-use and tied to the widget instance that
    // issued it -- switching modes remounts the widget, so the old token
    // would just be rejected as stale if we kept it around
    setCaptchaToken(null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (mode === 'signup' && !intent) {
      setError("Let us know if you're here to buy, sell, or both.")
      return
    }
    if (mode === 'signup' && !agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setBusy(true)
    if (mode === 'signup') {
      setRememberMe(true)
      const { data, error } = await signUp(email, password, name, referredBy, intent, captchaToken)
      if (error) setError(error.message)
      else if (!data.session) setNotice('Check your email for a confirmation link, then log in.')
      else onSignedUp?.()
    } else if (mode === 'reset') {
      const { error } = await resetPassword(email, captchaToken)
      if (error) setError(error.message)
      else setNotice('Check your email for a password reset link.')
    } else {
      setRememberMe(remember)
      const { error } = await signIn(email, password, captchaToken)
      if (error) setError(error.message)
    }
    setBusy(false)
  }

  if (legalDoc) {
    return (
      <div className="max-w-md mx-auto min-h-screen" style={{ background: 'var(--paper)' }}>
        <Suspense fallback={null}>
          <LegalScreen doc={legalDoc} onBack={() => setLegalDoc(null)} />
        </Suspense>
      </div>
    )
  }

  return (
    // h-dvh (not min-h-screen) + overflow-hidden on the outer shell pins this
    // to the real visible viewport instead of letting the page scroll, so it
    // reads as one static, centered screen (same fix as the onboarding
    // carousel). The centered content gets its own overflow-y-auto as a
    // safety net -- signup mode has enough fields + an open keyboard could
    // still need it on a short device, but it should never be the whole
    // page that scrolls.
    <div className="max-w-md mx-auto h-dvh overflow-hidden flex flex-col px-6" style={{ background: 'var(--paper)' }}>
      {onClose && (
        <button
          onClick={onClose}
          className="pressable self-start text-xs mt-6 shrink-0"
          style={{ color: 'var(--ink-soft)' }}
        >
          ← Continue browsing
        </button>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center py-4">
        <div className="flex justify-center mb-3">
          <Logo size={52} />
        </div>
        <h1 className="font-display text-3xl text-center mb-1" style={{ color: 'var(--forest-dark)' }}>
          Plates
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--ink-soft)' }}>
          {mode === 'signin' && (reason || 'Log in to browse and order.')}
          {mode === 'signup' && 'Create an account to start buying and selling.'}
          {mode === 'reset' && "We'll email you a link to reset your password."}
        </p>

        {claimCode ? (
          <p
            className="text-xs text-center mb-4 rounded-full px-3 py-1.5 mx-auto"
            style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}
          >
            🏪 Sign up or log in to claim your store
          </p>
        ) : (
          mode === 'signup' &&
          referredBy && (
            <p
              className="text-xs text-center mb-4 rounded-full px-3 py-1.5 mx-auto"
              style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
            >
              🎉 You were invited by a neighbor
            </p>
          )
        )}

        {mode !== 'reset' && (
          <>
            <div className={`flex gap-2.5 ${appleFirst ? 'flex-col' : 'flex-col-reverse'}`}>
              <button
                type="button"
                onClick={() => socialSignIn('apple')}
                disabled={busy}
                className="pressable w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2.5 disabled:opacity-60"
                style={{ background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--paper)' }}
              >
                <AppleIcon />
                Continue with Apple
              </button>
              <button
                type="button"
                onClick={() => socialSignIn('google')}
                disabled={busy}
                className="pressable w-full py-3 rounded-xl text-sm font-semibold border flex items-center justify-center gap-2.5 disabled:opacity-60"
                style={{ background: 'var(--card)', borderColor: 'var(--rule)', color: 'var(--ink)' }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </div>
            <div className="flex items-center gap-3 my-4 text-xs" style={{ color: 'var(--ink-soft)' }}>
              <span className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
              or
              <span className="flex-1 h-px" style={{ background: 'var(--rule)' }} />
            </div>
          </>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
        {mode === 'signup' && (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="field"
            required
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="field"
          required
        />
        {mode !== 'reset' && (
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="field"
            required
            minLength={6}
          />
        )}

        {mode === 'signin' && (
          <label className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me on this device
          </label>
        )}

        {mode === 'signup' && (
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              What brings you to Plates?
            </p>
            <div className="flex gap-2">
              {[
                { value: 'buyer', label: '🛒 Buy' },
                { value: 'seller', label: "👩‍🍳 Sell" },
                { value: 'both', label: '🤝 Both' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setIntent(opt.value)}
                  className="pressable flex-1 py-2.5 rounded-xl text-xs font-bold border"
                  style={
                    intent === opt.value
                      ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                      : { borderColor: 'var(--rule)', color: 'var(--ink)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'signup' && (
          <label className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I'm 18 or older, and I agree to the{' '}
              <button type="button" onClick={() => setLegalDoc('terms')} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" onClick={() => setLegalDoc('privacy')} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
                Privacy Policy
              </button>
              , including that Plates is just a listing platform (not the seller of any food) and
              that I'm buying, selling, and eating homemade food at my own risk.
            </span>
          </label>
        )}

        {!isNative && (
          <TurnstileWidget key={mode} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />
        )}

        {(error || oauthError) && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {error || oauthError}
          </p>
        )}
        {notice && (
          <p className="text-xs" style={{ color: 'var(--forest-dark)' }}>
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || (!isNative && !captchaToken)}
          className="pressable w-full mt-2 py-3 rounded-xl font-medium text-sm disabled:opacity-60 hover:opacity-90 active:opacity-80 transition-opacity"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Log in' : mode === 'signup' ? 'Sign up' : 'Send reset link'}
        </button>
        </form>

        {mode === 'signin' && (
          <button onClick={() => switchMode('reset')} className="text-xs text-center mt-3" style={{ color: 'var(--ink-soft)' }}>
            Forgot password?
          </button>
        )}

        <button
          onClick={() => switchMode(mode === 'signup' ? 'signin' : mode === 'reset' ? 'signin' : 'signup')}
          className="text-xs text-center mt-2"
          style={{ color: 'var(--ink-soft)' }}
        >
          {mode === 'signin' && "Don't have an account? Sign up"}
          {mode === 'signup' && 'Already have an account? Log in'}
          {mode === 'reset' && 'Back to log in'}
        </button>
      </div>
    </div>
  )
}
