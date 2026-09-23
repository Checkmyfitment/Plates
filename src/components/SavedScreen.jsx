import ListingCard from './ListingCard'
import ListingCardSkeleton from './ListingCardSkeleton'
import Placeholder from './Placeholder'

export default function SavedScreen({ listings, loading, onSelect, favoriteIds, onToggleFavorite, onQuickOrder, onBack }) {
  const header = onBack && (
    <div className="flex items-center gap-3 mb-5">
      <button
        onClick={onBack}
        aria-label="Back"
        className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
        style={{ color: 'var(--forest-dark)' }}
      >
        ←
      </button>
      <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
        Saved
      </h2>
    </div>
  )

  if (loading) {
    return (
      <div className="px-5 pt-6 pb-4">
        {header}
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (listings.length === 0) {
    return (
      <div className="px-5 pt-6 pb-4">
        {header}
        <Placeholder icon="♡" title="No saved listings yet" body="Tap the heart on a listing to save it for later." />
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-4">
      {header}
      <div className="grid grid-cols-2 gap-3">
        {listings.map((l) => (
          <ListingCard
            key={l.id}
            listing={l}
            onSelect={onSelect}
            isFavorite={favoriteIds.has(l.id)}
            onToggleFavorite={onToggleFavorite}
            onQuickOrder={onQuickOrder}
          />
        ))}
      </div>
    </div>
  )
}
