import { useEffect, useState } from 'react'
import { CUISINES } from '../lib/listingOptions'
import { fetchFollowedCuisines, followCuisine, unfollowCuisine } from '../lib/alerts'
import { fetchProfile, setAreaAlertsEnabled } from '../lib/profiles'

// Human-readable summary of what's currently active, in a stable order
// (nearby first, then cuisines in their canonical order) rather than
// Set-insertion order, so it doesn't jump around as things are toggled.
function summarize(nearbyEnabled, following) {
  const items = []
  if (nearbyEnabled) items.push('Anything nearby')
  items.push(...CUISINES.filter((c) => following.has(c)))
  if (items.length === 0) return null
  if (items.length <= 3) return items.join(', ')
  return `${items.slice(0, 3).join(', ')}, and ${items.length - 3} more`
}

// One flat, single control for "what new listings should notify me" —
// previously two separate cards (an area radius toggle and a cuisine chip
// picker), then a flat always-expanded chip grid. Now a single "Turn on
// notifications" button for the common case (defaults to "anything
// nearby," the broadest useful setting), plus "Edit notifications" to open
// the same chip grid for anyone who wants to fine-tune instead.
export default function ListingAlerts({ userId }) {
  const [following, setFollowing] = useState(new Set())
  const [nearbyEnabled, setNearbyEnabled] = useState(false)
  const [hasLocation, setHasLocation] = useState(false)
  const [loading, setLoading] = useState(true)
  const [nearbyBusy, setNearbyBusy] = useState(false)
  const [turningOn, setTurningOn] = useState(false)
  const [editing, setEditing] = useState(false)

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

  const setNearby = async (next) => {
    setNearbyBusy(true)
    setNearbyEnabled(next)
    try {
      await setAreaAlertsEnabled(userId, next)
    } catch (err) {
      console.error('Failed to update area alerts', err)
      setNearbyEnabled(!next)
    } finally {
      setNearbyBusy(false)
    }
  }

  const turnOn = async () => {
    setTurningOn(true)
    await setNearby(true)
    setTurningOn(false)
  }

  if (loading) return null

  const summary = summarize(nearbyEnabled, following)

  return (
    <div className="mt-5">
      <h3 className="text-xs font-medium mb-1" style={{ color: 'var(--ink-soft)' }}>
        🔔 New listing alerts
      </h3>

      {!editing && (
        <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
          {summary ? `Getting alerts for: ${summary}` : "Get notified the moment a new listing goes up nearby — you'll pick exactly what counts."}
        </p>
      )}

      {!editing && (
        <div className="flex flex-wrap items-center gap-2">
          {!summary && (
            <button
              type="button"
              onClick={turnOn}
              disabled={turningOn || !hasLocation}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-50"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              {turningOn ? 'Turning on…' : '🔔 Turn on notifications'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="pressable text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            Edit notifications
          </button>
        </div>
      )}

      {!editing && !hasLocation && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
          Set a neighborhood in Edit profile first so we know what's nearby.
        </p>
      )}

      {editing && (
        <>
          <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
            Tap any of these on — you'll be notified when a new listing matches.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setNearby(!nearbyEnabled)}
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
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="pressable text-xs mt-2.5 underline"
            style={{ color: 'var(--ink-soft)' }}
          >
            Done
          </button>
        </>
      )}
    </div>
  )
}
