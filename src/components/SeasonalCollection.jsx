import { getActiveCollection, getCollectionListings } from '../lib/seasonalCollections'
import ListingCard from './ListingCard'

export default function SeasonalCollection({ listings, favoriteIds, onToggleFavorite, onSelect }) {
  const collection = getActiveCollection()
  if (!collection) return null

  const items = getCollectionListings(listings, collection)
  if (items.length === 0) return null

  return (
    <div className="mb-4">
      <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--ink-soft)' }}>
        {collection.title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((l) => (
          <div key={l.id} className="shrink-0" style={{ width: 140 }}>
            <ListingCard listing={l} onSelect={onSelect} isFavorite={favoriteIds?.has(l.id)} onToggleFavorite={onToggleFavorite} />
          </div>
        ))}
      </div>
    </div>
  )
}
