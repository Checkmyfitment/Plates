const KEY = 'plates_recently_viewed'
const MAX_ENTRIES = 10

export function addRecentlyViewed(listingId) {
  try {
    const ids = getRecentlyViewedIds()
    const next = [listingId, ...ids.filter((id) => id !== listingId)].slice(0, MAX_ENTRIES)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore — worst case the strip just doesn't show
  }
}

export function getRecentlyViewedIds() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
