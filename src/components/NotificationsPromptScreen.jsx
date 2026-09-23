import { useState } from 'react'
import { isPushSupported, subscribeToPush } from '../lib/push'
import { isNativePushSupported, registerNativePush } from '../lib/nativePush'
import Logo from './Logo'

// Shown once, right after a brand-new signup -- the same registerNativePush/
// subscribeToPush calls PushToggle.jsx uses from deep inside Settings, just
// surfaced up front with context ("we'll tell you when your order's ready")
// instead of left for someone to stumble onto later.
export default function NotificationsPromptScreen({ userId, onDone }) {
  const [busy, setBusy] = useState(false)

  const allow = async () => {
    setBusy(true)
    try {
      if (isNativePushSupported()) {
        await registerNativePush(userId)
      } else if (isPushSupported()) {
        await subscribeToPush(userId)
      }
    } catch (err) {
      console.error('Failed to enable push notifications', err)
      // not fatal to onboarding either way -- they can always turn it on
      // later from Settings, so just move on rather than blocking signup
    } finally {
      setBusy(false)
      onDone()
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ background: 'var(--paper)' }}>
      <Logo size={56} />
      <h1 className="font-display text-2xl mt-5 mb-2" style={{ color: 'var(--forest-dark)' }}>
        Stay in the loop
      </h1>
      <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--ink-soft)' }}>
        We'll let you know when your order's ready, when a seller messages you, and when something new goes up nearby.
      </p>
      <button
        onClick={allow}
        disabled={busy}
        className="pressable w-full max-w-xs text-sm font-bold px-5 py-3 rounded-full mb-3 disabled:opacity-50"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {busy ? 'Working…' : 'Allow Notifications'}
      </button>
      <button
        onClick={onDone}
        disabled={busy}
        className="pressable text-sm font-medium px-5 py-2 disabled:opacity-50"
        style={{ color: 'var(--ink-soft)' }}
      >
        Not now
      </button>
    </div>
  )
}
