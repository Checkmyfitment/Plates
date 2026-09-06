import { useEffect, useState } from 'react'
import { CUISINES } from '../lib/listingOptions'
import { fetchFollowedCuisines, followCuisine, unfollowCuisine } from '../lib/alerts'
import { fetchProfile, setAreaAlertsEnabled } from '../lib/profiles'

// One flat, single control for "what new listings should notify me" —
// previously two separate cards (an area radius toggle and a cuisine chip
// picker) that looked like different features but did the same job, just
// two different ways to match a listing. Mixing "Anything nearby" in as
// just another chip alongside the cuisines makes that plain: tap any
// combination of these on, and a new listing matching any of them notifies
// you (via the in-app bell, and on-device too if push is turned on above).
export default function ListingAlerts({ userId }) {
  const [following, setFollowing] = useState(new Set())
  const [nearbyEnabled, setNearbyEnabled] = useState(false)
  const [hasLocation, setHasLocation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nearbyBusy, setNearbyBusy] = useState(false)

  useEffect(() => {
    Promise.all([fetchFollowedCuisines(userId), fetchProfile(userId)])
      .then(([cuisines, profile]) => {
        setFollowing(cuisines)
        setNearbyEnabled(!!profile.area_alerts_enabled)
        setHasLocation(profile.lat != null && profile.lng != null)
      })
      .catch((err) => console.error('Failed to load listing alert settings', err))
      .finally(() => setLoading(false))
  }, [userId])

  const toggleCuisine = (cuisine) => {
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

  const toggleNearby = () => {
    if (!hasLocation) return
    const next = !nearbyEnabled
    setNearbyBusy(true)
    setNearbyEnabled(next)
    setAreaAlertsEnabled(userId, next)
      .catch((err) => {
        console.error('Failed to update area alerts', err)
        setNearbyEnabled(!next)
      })
      .finally(() => setNearbyBusy(false))
  }

  if (loading) return null

  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
        🔔 New listing alerts
      </h3>
      <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
        Tap any of these on — you'll be notified when a new listing matches.
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={toggleNearby}
          disabled={!hasLocation || nearbyBusy}
          title={hasLocation ? undefined : 'Set a neighborhood in Edit profile first'}
          className="pressable text-xs px-2.5 py-1 rounded-full border disabled:opacity-40"
          style={{
            background: nearbyEnabled ? 'var(--forest)' : 'transparent',
            color: nearbyEnabled ? 'white' : 'var(--ink-soft)',
            borderColor: nearbyEnabled ? 'var(--forest)' : 'var(--rule)',
          }}
        >
          {nearbyEnabled ? '🔔 ' : '📍 '}Anything nearby
        </button>
        {CUISINES.map((c) => {
          const active = following.has(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => toggleCuisine(c)}
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
      {!hasLocation && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
          Set a neighborhood in Edit profile to also get alerts for anything posted nearby,
          regardless of cuisine.
        </p>
      )}
    </div>
  )
}
