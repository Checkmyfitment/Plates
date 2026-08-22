import { useEffect, useState } from 'react'
import { fetchMySubscriptions, cancelSubscription } from '../lib/subscriptions'

export default function MySubscriptions({ userId, onOpenListing }) {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMySubscriptions(userId)
      .then(setSubs)
      .catch((err) => console.error('Failed to load subscriptions', err))
      .finally(() => setLoading(false))
  }, [userId])

  const cancel = (id) => {
    setSubs((prev) => prev.filter((s) => s.id !== id))
    cancelSubscription(id).catch((err) => {
      console.error('Failed to cancel subscription', err)
    })
  }

  if (loading || subs.length === 0) return null

  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        🔁 Your recurring orders
      </h3>
      <div className="flex flex-col gap-1.5">
        {subs.map((s) => (
          <div key={s.id} className="flex items-center gap-2.5 card-elevated p-2">
            <button
              onClick={() => onOpenListing?.(s.listingId)}
              className="pressable flex items-center gap-2.5 flex-1 min-w-0 text-left"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-base overflow-hidden shrink-0"
                style={{ background: s.bg }}
              >
                {s.photoUrl ? (
                  <img src={s.photoUrl} alt={s.listingTitle} className="w-full h-full object-cover" />
                ) : (
                  s.photo
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{s.listingTitle}</p>
                <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                  {s.sellerName} · {s.quantity}x every {s.intervalDays === 7 ? 'week' : '2 weeks'} · next{' '}
                  {new Date(s.nextOrderDate + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </button>
            <button
              onClick={() => cancel(s.id)}
              className="pressable text-xs px-2.5 py-1 rounded-full border shrink-0"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
