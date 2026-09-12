import ListingCard from './ListingCard'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

// Public version of the same "new this week" idea the weekly follower
// digest already sends privately -- this surfaces it to everyone browsing,
// not just people who already follow a kitchen, so a new listing gets a
// chance to be discovered by neighbors who've never heard of that seller
// yet. Purely a client-side filter over listings already in hand, same
// pattern as SeasonalCollection/RecentlyViewed -- no new fetch.
export default function WhatsCookingThisWeek({ listings, favoriteIds, onToggleFavorite, onSelect }) {
  const cutoff = Date.now() - WEEK_MS
  const recent = listings
    .filter((l) => l.createdAt && new Date(l.createdAt).getTime() >= cutoff)
    .filter((l) => l.available !== false && l.unclaimedStoreId == null)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12)

  if (recent.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        🆕 What's cooking this week
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recent.map((l) => (
          <div key={l.id} className="shrink-0" style={{ width: 140 }}>
            <ListingCard
              listing={l}
              onSelect={onSelect}
              isFavorite={favoriteIds?.has(l.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
