import { useEffect, useState } from 'react'
import { fetchFollowedSellers, unfollowSeller } from '../lib/follows'

export default function FollowedKitchens({ userId, onOpenSeller }) {
  const [kitchens, setKitchens] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowedSellers(userId)
      .then(setKitchens)
      .catch((err) => console.error('Failed to load followed kitchens', err))
      .finally(() => setLoading(false))
  }, [userId])

  const unfollow = (sellerId) => {
    setKitchens((prev) => prev.filter((k) => k.id !== sellerId))
    unfollowSeller(userId, sellerId).catch((err) => {
      console.error('Failed to unfollow seller', err)
    })
  }

  if (loading || kitchens.length === 0) return null

  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        👩‍🍳 Kitchens you follow
      </h3>
      <div className="flex flex-col gap-1.5">
        {kitchens.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-2.5 card-elevated p-2"
          >
            <button
              onClick={() => onOpenSeller(k.id)}
              className="pressable flex items-center gap-2.5 flex-1 min-w-0 text-left"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden shrink-0"
                style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
              >
                {k.avatarUrl ? (
                  <img src={k.avatarUrl} alt={k.name} className="w-full h-full object-cover" />
                ) : (
                  k.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{k.name}</p>
                {k.neighborhood && (
                  <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                    {k.neighborhood}
                  </p>
                )}
              </div>
            </button>
            <button
              onClick={() => unfollow(k.id)}
              className="pressable text-xs px-2.5 py-1 rounded-full border shrink-0"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Unfollow
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
