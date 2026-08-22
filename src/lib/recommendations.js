// Cheap "because you liked X" recommender — no ML, just cuisine overlap
// with whatever the buyer has already saved. Good enough at this scale,
// and doesn't need a fetch of its own since it works off data the Browse
// screen already has loaded.
export function getRecommendedListings(listings, favoriteIds, currentUserId, limit = 8) {
  if (!favoriteIds || favoriteIds.size === 0) return { listings: [], cuisine: null }

  const favorited = listings.filter((l) => favoriteIds.has(l.id))
  const cuisineCounts = new Map()
  favorited.forEach((l) => {
    if (!l.cuisine) return
    cuisineCounts.set(l.cuisine, (cuisineCounts.get(l.cuisine) ?? 0) + 1)
  })
  if (cuisineCounts.size === 0) return { listings: [], cuisine: null }

  const [topCuisine] = [...cuisineCounts.entries()].sort((a, b) => b[1] - a[1])[0]

  const recs = listings.filter(
    (l) =>
      l.cuisine === topCuisine &&
      !favoriteIds.has(l.id) &&
      l.sellerId !== currentUserId &&
      l.available !== false &&
      !l.unclaimedStoreId,
  )

  return { listings: recs.slice(0, limit), cuisine: topCuisine }
}
