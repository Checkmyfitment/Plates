import { useEffect, useState } from 'react'
import { joinAreaWaitlist, fetchWaitlistCount } from '../lib/waitlist'
import { useToast } from '../context/ToastContext'

export default function AreaWaitlistCard({ defaultNeighborhood = '', title = "📍 Not in your neighborhood yet?" }) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [neighborhood, setNeighborhood] = useState(defaultNeighborhood)
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(false)
  const [count, setCount] = useState(0)

  // real demand, not a vague appeal -- refetched (debounced) as the typed
  // neighborhood changes, so someone editing it sees an honest number for
  // what they actually typed, not just the default they landed with
  useEffect(() => {
    let cancelled = false
    const handle = setTimeout(() => {
      fetchWaitlistCount(neighborhood)
        .then((n) => {
          if (!cancelled) setCount(n)
        })
        .catch((err) => console.error('Failed to load waitlist count', err))
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(handle)
    }
  }, [neighborhood])

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      await joinAreaWaitlist({ email, neighborhood })
      setCount((c) => c + 1)
      setJoined(true)
    } catch (err) {
      console.error('Failed to join waitlist', err)
      toast.error('Could not save that — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (joined) {
    return (
      <div className="card-elevated p-4 text-center mb-4">
        <p className="text-sm font-medium">✓ You're on the list!</p>
        <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
          {count > 1 && `You're one of ${count} neighbors waiting — `}
          We'll email you the moment a cook joins {neighborhood ? `near ${neighborhood}` : 'near you'}.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="card-elevated p-4 mb-4">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1 mb-1" style={{ color: 'var(--ink-soft)' }}>
        Tell us where you are and we'll email you the moment a cook joins nearby.
      </p>
      {count > 0 && (
        <p className="text-xs mb-2 font-medium" style={{ color: 'var(--forest-dark)' }}>
          🙋 {count} neighbor{count === 1 ? '' : 's'} already waiting{neighborhood ? ` near ${neighborhood}` : ''}
        </p>
      )}
      <div className="flex flex-col gap-2">
        <input
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          placeholder="Your neighborhood or zip code"
          className="field text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="you@example.com"
          className="field text-sm"
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="pressable text-sm py-2 rounded-xl font-medium disabled:opacity-60"
          style={{ background: 'var(--forest)', color: 'white' }}
        >
          {submitting ? 'Joining…' : 'Notify me'}
        </button>
      </div>
    </form>
  )
}
