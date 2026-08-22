import ListingCard from './ListingCard'
import ListingCardSkeleton from './ListingCardSkeleton'
import Placeholder from './Placeholder'

export default function SavedScreen({ listings, loading, onSelect, favoriteIds, onToggleFavorite }) {
  if (loading) {
    return (
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (listings.length === 0) {
    return <Placeholder icon="♡" title="No saved listings yet" body="Tap the heart on a listing to save it for later." />
  }

  return (
    <div className="px-5 pb-4">
      <div className="grid grid-cols-2 gap-3">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onSelect={onSelect}
            isFavorite={favoriteIds.has(l.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </div>
  )
}
