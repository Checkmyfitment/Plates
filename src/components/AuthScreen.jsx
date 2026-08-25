import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'
import LegalScreen from './LegalScreen'
import { savePendingClaim } from '../lib/stores'
import { setRememberMe } from '../lib/supabaseClient'

export default function AuthScreen({ onClose, reason }) {
  const { signIn, signUp, resetPassword } = useAuth()
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

  const switchMode = (next) => {
    setMode(next)
    setError('')
    setNotice('')
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
      const { data, error } = await signUp(email, password, name, referredBy, intent)
      if (error) setError(error.message)
      else if (!data.session) setNotice('Check your email for a confirmation link, then log in.')
    } else if (mode === 'reset') {
      const { error } = await resetPassword(email)
      if (error) setError(error.message)
      else setNotice('Check your email for a password reset link.')
    } else {
      setRememberMe(remember)
      const { error } = await signIn(email, password)
      if (error) setError(error.message)
    }
    setBusy(false)
  }

  if (legalDoc) {
    return (
      <div className="max-w-md mx-auto min-h-screen" style={{ background: 'var(--paper)' }}>
        <LegalScreen doc={legalDoc} onBack={() => setLegalDoc(null)} />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-6" style={{ background: 'var(--paper)' }}>
      {onClose && (
        <button
          onClick={onClose}
          className="pressable self-start text-xs mb-2"
          style={{ color: 'var(--ink-soft)' }}
        >
          ← Continue browsing
        </button>
      )}
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
              required
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

        {error && (
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {error}
          </p>
        )}
        {notice && (
          <p className="text-xs" style={{ color: 'var(--forest-dark)' }}>
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
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
  )
}
