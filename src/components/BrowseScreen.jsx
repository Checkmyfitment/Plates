import { useEffect, useState, lazy, Suspense } from 'react'
import ListingCard from './ListingCard'
import ListingCardSkeleton from './ListingCardSkeleton'
import TrendingKitchens from './TrendingKitchens'
import NeighborhoodLeaderboard from './NeighborhoodLeaderboard'
import SeasonalCollection from './SeasonalCollection'
import RecentlyViewed from './RecentlyViewed'
import RecommendedForYou from './RecommendedForYou'
import { distanceMiles, formatDistance } from '../lib/geo'
import { getSavedBrowseFilters, saveBrowseFilters } from '../lib/browseFilters'
import AreaWaitlistCard from './AreaWaitlistCard'

// loads Leaflet (a sizeable dependency) only when someone actually taps
// into map view, instead of shipping it in everyone's initial bundle
const KitchensMap = lazy(() => import('./KitchensMap'))

// same cuisine vocabulary as the listing form's own dropdown, so a chip
// here always matches something a seller could actually have picked
const CUISINES = ['Homemade', 'Meal Prep', 'Bakery', 'Mexican', 'Italian', 'Indian', 'Chinese', 'Middle Eastern', 'Caribbean', 'Southern / Soul food', 'Desserts', 'Other']
const filters = ['All', ...CUISINES, 'Vegan', 'Under $15']

function searchFields(l) {
  return {
    title: (l.title ?? '').toLowerCase(),
    cuisine: (l.cuisine ?? '').toLowerCase(),
    seller: (l.seller ?? '').toLowerCase(),
    description: (l.description ?? '').toLowerCase(),
    diet: (l.diet ?? []).join(' ').toLowerCase(),
  }
}

function matchesAllWords(fields, words) {
  const combined = `${fields.title} ${fields.cuisine} ${fields.seller} ${fields.description} ${fields.diet}`
  return words.every((w) => combined.includes(w))
}

function relevanceScore(fields, words) {
  let score = 0
  for (const w of words) {
    if (fields.title.includes(w)) score += 3
    if (fields.cuisine.includes(w)) score += 2
    if (fields.seller.includes(w)) score += 1
    if (fields.description.includes(w)) score += 1
    if (fields.diet.includes(w)) score += 1
  }
  return score
}

export default function BrowseScreen({ listings, loading, onSelect, favoriteIds, onToggleFavorite, userLocation, userNeighborhood, onOpenSeller }) {
  const [active, setActive] = useState(() => getSavedBrowseFilters()?.active ?? 'All')
  const [query, setQuery] = useState('')
  const [view, setView] = useState(() => getSavedBrowseFilters()?.view ?? 'list')
  const [nearestFirst, setNearestFirst] = useState(false)
  const [radiusMiles, setRadiusMiles] = useState(() => getSavedBrowseFilters()?.radiusMiles ?? null)

  useEffect(() => {
    saveBrowseFilters({ active, view, radiusMiles })
  }, [active, view, radiusMiles])

  // each unclaimed store counts as its own distinct "seller" here, since
  // sellerId alone would otherwise collapse every store an admin has
  // posted for into a single entry under the admin's own account
  const sellerKey = (l) => l.unclaimedStoreId ?? l.sellerId
  const neighborhoodSellers = userNeighborhood
    ? new Set(listings.filter((l) => l.sellerNeighborhood === userNeighborhood).map(sellerKey)).size
    : 0
  const totalSellers = new Set(listings.map(sellerKey)).size

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const withDistance = listings.map((l) => {
    const hasBoth = userLocation && l.sellerLat != null && l.sellerLng != null
    const distance = hasBoth
      ? distanceMiles(userLocation.lat, userLocation.lng, l.sellerLat, l.sellerLng)
      : null
    return { ...l, distance }
  })
  let filtered = withDistance
    .filter((l) => {
      if (words.length === 0) return true
      return matchesAllWords(searchFields(l), words)
    })
    .filter((l) => {
      if (active === 'All') return true
      if (active === 'Vegan') return l.diet.includes('Vegan') || l.cuisine === 'Vegan'
      if (active === 'Under $15') return l.price < 15
      return l.cuisine === active
    })
    // a listing with no computable distance (e.g. an unclaimed store with
    // just a typed-in neighborhood, no geocoded point) stays visible rather
    // than disappearing just because we can't measure it
    .filter((l) => radiusMiles == null || l.distance == null || l.distance <= radiusMiles)

  if (nearestFirst) {
    filtered = [...filtered].sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0
      if (a.distance == null) return 1
      if (b.distance == null) return -1
      return a.distance - b.distance
    })
  } else if (words.length > 0) {
    filtered = [...filtered].sort((a, b) => relevanceScore(searchFields(b), words) - relevanceScore(searchFields(a), words))
  } else {
    // keep default order stable, just float featured listings to the top
    filtered = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0))
  }

  return (
    <div className="px-5 pb-4">
      {totalSellers > 0 && (
        <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
          {neighborhoodSellers > 0
            ? `🏘️ ${neighborhoodSellers} neighbor${neighborhoodSellers === 1 ? '' : 's'} sharing food in ${userNeighborhood}`
            : `🏘️ ${totalSellers} home cook${totalSellers === 1 ? '' : 's'} · ${listings.length} dish${listings.length === 1 ? '' : 'es'} up for grabs`}
        </p>
      )}
      {userNeighborhood && neighborhoodSellers === 0 && totalSellers > 0 && (
        <AreaWaitlistCard
          defaultNeighborhood={userNeighborhood}
          title={`📍 No cooks in ${userNeighborhood} yet`}
        />
      )}
      <SeasonalCollection listings={listings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} onSelect={onSelect} />
      {onOpenSeller && <TrendingKitchens onOpenSeller={onOpenSeller} userLocation={userLocation} />}
      {onOpenSeller && userNeighborhood && (
        <NeighborhoodLeaderboard neighborhood={userNeighborhood} onOpenSeller={onOpenSeller} />
      )}
      <RecentlyViewed listings={listings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} onSelect={onSelect} />
      <RecommendedForYou listings={listings} favoriteIds={favoriteIds} onToggleFavorite={onToggleFavorite} onSelect={onSelect} />
      <div
        className="flex items-center gap-2.5 rounded-2xl border bg-[var(--card)] px-4 py-3 mb-3"
        style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-card)' }}
      >
        <span style={{ color: 'var(--ink-soft)' }}>⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tamales, sourdough, dumplings…"
          className="bg-transparent outline-none text-sm font-medium w-full placeholder:text-[var(--ink-soft)] placeholder:font-medium"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 mb-2.5">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActive(f)}
            className="pressable shrink-0 text-xs font-bold px-3.5 py-2 rounded-full whitespace-nowrap border-2"
            style={{
              background: active === f ? 'var(--ink)' : 'var(--card)',
              color: active === f ? 'var(--paper)' : 'var(--ink-soft)',
              borderColor: active === f ? 'var(--ink)' : 'var(--rule)',
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 mb-4">
        {userLocation ? (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setNearestFirst((v) => !v)}
              className="pressable shrink-0 text-xs font-bold px-3.5 py-2 rounded-full border-2 whitespace-nowrap"
              style={{
                background: nearestFirst ? 'var(--ink)' : 'var(--card)',
                color: nearestFirst ? 'var(--paper)' : 'var(--ink-soft)',
                borderColor: nearestFirst ? 'var(--ink)' : 'var(--rule)',
              }}
            >
              📍 Nearest
            </button>
            <select
              value={radiusMiles ?? ''}
              onChange={(e) => setRadiusMiles(e.target.value === '' ? null : Number(e.target.value))}
              aria-label="Search radius"
              className="pressable shrink-0 text-xs font-bold pl-3 pr-2 py-2 rounded-full border-2 bg-[var(--card)]"
              style={{ color: 'var(--ink-soft)', borderColor: 'var(--rule)' }}
            >
              <option value="">Any distance</option>
              <option value="5">Within 5 mi</option>
              <option value="10">Within 10 mi</option>
              <option value="25">Within 25 mi</option>
              <option value="50">Within 50 mi</option>
            </select>
          </div>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 rounded-full border-2 overflow-hidden text-xs font-bold" style={{ borderColor: 'var(--rule)' }}>
          <button
            onClick={() => setView('list')}
            className="pressable px-3.5 py-2"
            style={{
              background: view === 'list' ? 'var(--ink)' : 'var(--card)',
              color: view === 'list' ? 'var(--paper)' : 'var(--ink-soft)',
            }}
          >
            List
          </button>
          <button
            onClick={() => setView('map')}
            className="pressable px-3.5 py-2"
            style={{
              background: view === 'map' ? 'var(--ink)' : 'var(--card)',
              color: view === 'map' ? 'var(--paper)' : 'var(--ink-soft)',
            }}
          >
            Map
          </button>
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : view === 'map' ? (
        <Suspense fallback={<div className="skeleton h-96 w-full rounded-2xl" />}>
          <KitchensMap listings={filtered} onSelect={onSelect} />
        </Suspense>
      ) : filtered.length === 0 ? (
        listings.length === 0 ? (
          <div className="mt-6">
            <p className="text-sm text-center mb-4" style={{ color: 'var(--ink-soft)' }}>
              No listings yet — be the first to post one!
            </p>
            <AreaWaitlistCard title="📍 Not ready to post? Get notified instead" />
          </div>
        ) : (
          <p className="text-sm text-center mt-10" style={{ color: 'var(--ink-soft)' }}>
            No listings match your search.
          </p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((l) => (
            <ListingCard
              key={l.id}
              listing={l}
              onSelect={onSelect}
              isFavorite={favoriteIds.has(l.id)}
              onToggleFavorite={onToggleFavorite}
              distanceLabel={l.distance != null ? formatDistance(l.distance) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}
