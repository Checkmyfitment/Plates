import { getRecentlyViewedIds } from '../lib/recentlyViewed'
import ListingCard from './ListingCard'

export default function RecentlyViewed({ listings, favoriteIds, onToggleFavorite, onSelect, currentListingId }) {
  const ids = getRecentlyViewedIds().filter((id) => id !== currentListingId)
  if (ids.length === 0) return null

  const byId = new Map(listings.map((l) => [l.id, l]))
  const recent = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, 6)
  if (recent.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        👀 Recently viewed
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recent.map((l) => (
          <div key={l.id} className="shrink-0" style={{ width: 140 }}>
            <ListingCard listing={l} onSelect={onSelect} isFavorite={favoriteIds?.has(l.id)} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}
      </div>
    </div>
  )
}
