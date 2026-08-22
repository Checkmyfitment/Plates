import { useEffect, useState } from 'react'
import { isPushSupported, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from '../lib/push'
import { useToast } from '../context/ToastContext'

export default function PushToggle({ userId }) {
  const toast = useToast()
  const [supported, setSupported] = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) {
      setSupported(false)
      setChecking(false)
      return
    }
    getCurrentSubscription()
      .then((sub) => setSubscribed(!!sub))
      .catch((err) => console.error('Failed to check push subscription', err))
      .finally(() => setChecking(false))
  }, [])

  const toggle = async () => {
    setBusy(true)
    try {
      if (subscribed) {
        await unsubscribeFromPush()
        setSubscribed(false)
        toast.success('Push notifications turned off.')
      } else {
        await subscribeToPush(userId)
        setSubscribed(true)
        toast.success('Push notifications turned on.')
      }
    } catch (err) {
      console.error('Failed to update push subscription', err)
      toast.error(err.message || 'Could not update push notifications — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!supported || checking) return null

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-sm font-medium" style={{ color: 'var(--forest-dark)' }}>
        🔔 Push notifications
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        {subscribed
          ? "You'll get a notification on this device for new listings you follow."
          : 'Get notified on this device the moment a listing you follow goes up — even when Plates isn\'t open.'}
      </p>
      <button
        onClick={toggle}
        disabled={busy}
        className="pressable mt-2.5 text-xs px-3 py-1.5 rounded-full border font-medium disabled:opacity-50"
        style={
          subscribed
            ? { borderColor: 'var(--rule)', color: 'var(--ink-soft)' }
            : { borderColor: 'var(--forest)', color: 'var(--forest-dark)' }
        }
      >
        {busy ? 'Working…' : subscribed ? 'Turn off' : 'Turn on'}
      </button>
    </div>
  )
}
