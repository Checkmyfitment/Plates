import { useState, lazy, Suspense } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Logo from './Logo'

const LegalScreen = lazy(() => import('./LegalScreen'))

// Shown once to someone who just created an account with Google or Apple.
// The email signup form asks buy/sell/both and for the Terms agreement up
// front; social sign-in skips that form, so this collects the same two
// things before they get into the app.
export default function SocialSetupScreen({ onDone }) {
  const { user, profile, refreshProfile } = useAuth()
  const [intent, setIntent] = useState(null)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [legalDoc, setLegalDoc] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!intent) {
      setError("Let us know if you're here to buy, sell, or both.")
      return
    }
    if (!agreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.')
      return
    }
    setBusy(true)
    const { error: updateError } = await supabase.from('profiles').update({ signup_intent: intent }).eq('id', user.id)
    if (updateError) {
      setError(updateError.message)
      setBusy(false)
      return
    }
    await refreshProfile()
    setBusy(false)
    onDone()
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

  const firstName = profile?.name?.split(' ')[0]

  return (
    <div className="max-w-md mx-auto h-dvh overflow-hidden flex flex-col px-6" style={{ background: 'var(--paper)' }}>
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center py-4">
        <div className="flex justify-center mb-3">
          <Logo size={52} />
        </div>
        <h1 className="font-display text-2xl text-center mb-1" style={{ color: 'var(--forest-dark)' }}>
          {firstName ? `Welcome, ${firstName}` : 'Welcome to Plates'}
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--ink-soft)' }}>
          Two quick things and you're in.
        </p>

        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <p className="text-xs mb-1.5" style={{ color: 'var(--ink-soft)' }}>
              What brings you to Plates?
            </p>
            <div className="flex gap-2">
              {[
                { value: 'buyer', label: '🛒 Buy' },
                { value: 'seller', label: '👩‍🍳 Sell' },
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

          <label className="flex items-start gap-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>
              I'm 18 or older, and I agree to the{' '}
              <button type="button" onClick={() => setLegalDoc('terms')} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" onClick={() => setLegalDoc('privacy')} style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}>
                Privacy Policy
              </button>
              , including that Plates is just a listing platform (not the seller of any food) and that I'm buying,
              selling, and eating homemade food at my own risk.
            </span>
          </label>

          {error && (
            <p className="text-xs" style={{ color: 'var(--plum)' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="pressable w-full py-3 rounded-xl font-medium text-sm disabled:opacity-60 hover:opacity-90 active:opacity-80 transition-opacity"
            style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
          >
            {busy ? 'Please wait…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
