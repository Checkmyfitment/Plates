import { useEffect, useState } from 'react'
import { fetchProfile, setAreaAlertsEnabled } from '../lib/profiles'
import { useToast } from '../context/ToastContext'

export default function AreaAlertsToggle({ userId }) {
  const toast = useToast()
  const [hasLocation, setHasLocation] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchProfile(userId)
      .then((p) => {
        setHasLocation(p.lat != null && p.lng != null)
        setEnabled(!!p.area_alerts_enabled)
      })
      .catch((err) => console.error('Failed to load area alert settings', err))
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = async () => {
    const next = !enabled
    setBusy(true)
    setEnabled(next)
    try {
      await setAreaAlertsEnabled(userId, next)
      toast.success(next ? "You'll hear about new listings near you." : 'Area alerts turned off.')
    } catch (err) {
      console.error('Failed to update area alerts', err)
      setEnabled(!next)
      toast.error('Could not update that — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return null

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-sm font-medium" style={{ color: 'var(--forest-dark)' }}>
        📍 New listings near you
      </p>
      {hasLocation ? (
        <>
          <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
            {enabled
              ? "You'll be notified whenever someone posts a new listing within about 10 miles of you."
              : 'Get notified whenever someone posts a new listing within about 10 miles of you — no need to follow a specific cuisine.'}
          </p>
          <button
            onClick={toggle}
            disabled={busy}
            className="pressable mt-2.5 text-xs px-3 py-1.5 rounded-full border font-medium disabled:opacity-50"
            style={
              enabled
                ? { borderColor: 'var(--rule)', color: 'var(--ink-soft)' }
                : { borderColor: 'var(--forest)', color: 'var(--forest-dark)' }
            }
          >
            {busy ? 'Working…' : enabled ? 'Turn off' : 'Turn on'}
          </button>
        </>
      ) : (
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
          Set a neighborhood in Edit profile first — that's what this uses to figure out what's
          near you.
        </p>
      )}
    </div>
  )
}
