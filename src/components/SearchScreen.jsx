import { useEffect, useRef, useState } from 'react'
import ListingCard from './ListingCard'
import ListingCardSkeleton from './ListingCardSkeleton'
import TrendingKitchens from './TrendingKitchens'
import { CUISINES, CUISINE_EMOJI } from '../lib/listingOptions'
import { searchFields, matchesAllWords, relevanceScore } from '../lib/searchListings'

// "Top categories" always shows the same cuisine vocabulary a seller could
// have picked (see listingOptions.js, which already includes 'Vegan') plus
// the synthetic filters Browse also offers, so tapping one here behaves
// exactly like picking it there. Food Trucks is seller-level, not a
// cuisine, so it's not in CUISINES -- added on separately.
const CATEGORIES = [...CUISINES, 'Under $15', 'Food Trucks']

function categoryEmoji(name) {
  if (name === 'Under $15') return '💸'
  if (name === 'Food Trucks') return '🚚'
  return CUISINE_EMOJI[name] ?? '🍽️'
}

function matchesCategory(l, category) {
  if (!category) return true
  if (category === 'Vegan') return l.diet.includes('Vegan') || l.cuisine === 'Vegan'
  if (category === 'Under $15') return l.price < 15
  if (category === 'Food Trucks') return l.sellerIsFoodTruck
  return l.cuisine === category
}

export default function SearchScreen({ listings, loading, onSelect, favoriteIds, onToggleFavorite, userLocation, onOpenSeller }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const inputRef = useRef(null)

  // this screen exists so someone can start typing the instant they tap
  // the Search tab, instead of landing on a page they have to tap into first
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const searching = words.length > 0

  let results = []
  if (searching) {
    results = listings
      .filter((l) => matchesAllWords(searchFields(l), words))
      .sort((a, b) => relevanceScore(searchFields(b), words) - relevanceScore(searchFields(a), words))
  } else if (category) {
    results = listings.filter((l) => matchesCategory(l, category))
  }

  const showBrowse = !searching && !category

  return (
    <div className="px-5 pt-4 pb-4">
      <div
        className="flex items-center gap-2.5 rounded-2xl border bg-[var(--card)] px-4 py-3 mb-4"
        style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
      >
        <span style={{ color: 'var(--ink-soft)' }}>⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value.trim()) setCategory(null)
          }}
          placeholder="Tamales, sourdough, dumplings…"
          className="bg-transparent outline-none text-sm font-medium w-full placeholder:text-[var(--ink-soft)] placeholder:font-medium"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="pressable shrink-0 text-sm"
            style={{ color: 'var(--ink-soft)' }}
          >
            ✕
          </button>
        )}
      </div>

      {category && !searching && (
        <button
          type="button"
          onClick={() => setCategory(null)}
          className="pressable flex items-center gap-1.5 text-xs font-bold mb-3"
          style={{ color: 'var(--forest-dark)' }}
        >
          ← All categories
        </button>
      )}

      {showBrowse ? (
        <>
          <h2 className="font-display text-2xl mb-1" style={{ color: 'var(--forest-dark)' }}>
            Food you'll love
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--ink-soft)' }}>
            Search by dish, or browse a category to get started.
          </p>

          <h3 className="text-sm font-bold mb-2.5" style={{ color: 'var(--forest-dark)' }}>
            Top categories
          </h3>
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className="pressable flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center"
                style={{ borderColor: 'var(--rule)', background: 'var(--card)', boxShadow: 'var(--shadow-card)' }}
              >
                <span className="text-2xl leading-none">{categoryEmoji(c)}</span>
                <span className="text-[11px] font-bold leading-tight" style={{ color: 'var(--ink)' }}>
                  {c}
                </span>
              </button>
            ))}
          </div>

          {onOpenSeller && <TrendingKitchens onOpenSeller={onOpenSeller} userLocation={userLocation} />}
        </>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-center mt-10" style={{ color: 'var(--ink-soft)' }}>
          No listings match {searching ? 'your search' : category}.
        </p>
      ) : (
        <>
          {category && !searching && (
            <h3 className="text-sm font-bold mb-2.5" style={{ color: 'var(--forest-dark)' }}>
              {categoryEmoji(category)} {category}
            </h3>
          )}
          <div className="grid grid-cols-2 gap-3">
            {results.map((l) => (
              <ListingCard key={l.id} listing={l} onSelect={onSelect} isFavorite={favoriteIds.has(l.id)} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
