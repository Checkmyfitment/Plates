import { getRecommendedListings } from '../lib/recommendations'
import ListingCard from './ListingCard'

export default function RecommendedForYou({ listings, favoriteIds, onToggleFavorite, onSelect, currentUserId }) {
  const { listings: recs, cuisine } = getRecommendedListings(listings, favoriteIds, currentUserId)
  if (recs.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        ✨ Because you liked {cuisine}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {recs.map((l) => (
          <div key={l.id} className="shrink-0" style={{ width: 140 }}>
            <ListingCard listing={l} onSelect={onSelect} isFavorite={favoriteIds?.has(l.id)} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}
      </div>
    </div>
  )
}
