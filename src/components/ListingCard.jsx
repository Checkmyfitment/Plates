import { useState } from 'react'

export default function ListingCard({ listing, onSelect, isFavorite, onToggleFavorite, distanceLabel, onQuickOrder }) {
  const manuallySold = listing.available === false
  const away = listing.sellerOnVacation && !manuallySold
  const sold = manuallySold || listing.sellerOnVacation
  const [imgLoaded, setImgLoaded] = useState(false)
  const cornerBadge = manuallySold
    ? { label: 'Sold', bg: 'var(--plum)', color: 'white' }
    : away
      ? { label: '🏖️ Away', bg: 'var(--plum)', color: 'white' }
      : listing.featured
      ? { label: '✨ Featured', bg: 'var(--forest)', color: 'white' }
      : listing.tag
        ? {
            label: listing.tag,
            bg: listing.tagType === 'fresh' ? 'var(--forest)' : 'var(--mustard)',
            color: listing.tagType === 'fresh' ? 'white' : 'var(--forest-dark)',
          }
        : null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(listing)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(listing)
        }
      }}
      className="pressable text-left rounded-2xl overflow-hidden border bg-[var(--card)] relative cursor-pointer"
      style={{ borderColor: 'var(--rule)', opacity: sold ? 0.65 : 1, boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="h-32 flex items-center justify-center text-5xl relative overflow-hidden"
        style={{ background: listing.bg }}
      >
        {listing.photoUrl ? (
          <img
            src={listing.photoUrl}
            alt={listing.title}
            onLoad={() => setImgLoaded(true)}
            className="w-full h-full object-cover transition-opacity duration-300"
            style={{ opacity: imgLoaded ? 1 : 0 }}
          />
        ) : (
          listing.photo
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.2) 100%)' }}
        />
        {cornerBadge && (
          <span
            className="absolute top-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md font-bold"
            style={{ background: cornerBadge.bg, color: cornerBadge.color }}
          >
            {cornerBadge.label}
          </span>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label={isFavorite ? 'Remove from saved' : 'Save listing'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(listing.id)
            }}
            className="pressable absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center text-sm transition-colors"
            style={{ color: isFavorite ? 'var(--plum)' : 'var(--ink-soft)', background: 'color-mix(in srgb, var(--card) 90%, transparent)' }}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        )}
        <span
          className="absolute bottom-1.5 right-1.5 text-xs font-bold px-2 py-1 rounded-lg"
          style={{ background: 'rgba(27,24,21,0.82)', color: 'white', fontVariantNumeric: 'tabular-nums' }}
        >
          ${listing.price}
        </span>
        {!sold && listing.openNow && (
          <span
            className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1"
            style={{ background: 'rgba(27,24,21,0.82)', color: 'var(--forest)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--forest)' }} />
            Open now
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-bold leading-tight tracking-tight line-clamp-2 break-words">{listing.title}</p>
        <div className="flex items-center gap-1 mt-1 min-w-0">
          {listing.sellerIsFoodTruck && (
            <span className="shrink-0 text-xs" title="Food truck" aria-label="Food truck">
              🚚
            </span>
          )}
          <p className="text-xs font-medium truncate" style={{ color: 'var(--ink-soft)' }}>
            {listing.seller}
            {distanceLabel && <span> · {distanceLabel}</span>}
          </p>
          {listing.sellerAvgRating != null && (
            <span
              className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold"
              style={{ color: 'var(--mustard-deep)' }}
            >
              ★ {listing.sellerAvgRating}
            </span>
          )}
        </div>
        {listing.unclaimedStoreId && (
          <span
            className="inline-block text-[9px] px-1.5 py-0.5 rounded-md font-bold mt-1"
            style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}
          >
            🏪 Not yet on Plates
          </span>
        )}
        {!sold && listing.quantityAvailable != null && listing.quantityAvailable <= 3 && (
          <p className="text-[10px] mt-0.5 font-medium" style={{ color: 'var(--plum)' }}>
            {listing.quantityAvailable === 0 ? 'None left' : `Only ${listing.quantityAvailable} left`}
          </p>
        )}
        {!sold && onQuickOrder && (
          // you already deliberately saved this one -- skip re-reading the
          // full listing and jump straight to the order form instead of
          // making every order start back at the top of the page
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onQuickOrder(listing)
            }}
            className="pressable w-full mt-1.5 py-1.5 rounded-lg text-[11px] font-bold"
            style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
          >
            Order
          </button>
        )}
      </div>
    </div>
  )
}
