import { useEffect, useState } from 'react'
import { CUISINES } from '../lib/listingOptions'
import { fetchFollowedCuisines, followCuisine, unfollowCuisine } from '../lib/alerts'

export default function CuisineAlerts({ userId }) {
  const [following, setFollowing] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFollowedCuisines(userId)
      .then(setFollowing)
      .catch((err) => console.error('Failed to load cuisine alerts', err))
      .finally(() => setLoading(false))
  }, [userId])

  const toggle = (cuisine) => {
    const isFollowing = following.has(cuisine)
    setFollowing((prev) => {
      const next = new Set(prev)
      if (isFollowing) next.delete(cuisine)
      else next.add(cuisine)
      return next
    })
    const mutate = isFollowing ? unfollowCuisine(userId, cuisine) : followCuisine(userId, cuisine)
    mutate.catch((err) => {
      console.error('Failed to update cuisine alert', err)
      setFollowing((prev) => {
        const reverted = new Set(prev)
        if (isFollowing) reverted.add(cuisine)
        else reverted.delete(cuisine)
        return reverted
      })
    })
  }

  if (loading) return null

  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        🔔 Get notified about new listings
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {CUISINES.map((c) => {
          const active = following.has(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className="pressable text-xs px-2.5 py-1 rounded-full border"
              style={{
                background: active ? 'var(--forest)' : 'transparent',
                color: active ? 'white' : 'var(--ink-soft)',
                borderColor: active ? 'var(--forest)' : 'var(--rule)',
              }}
            >
              {active ? '🔔 ' : ''}
              {c}
            </button>
          )
        })}
      </div>
    </div>
  )
}
