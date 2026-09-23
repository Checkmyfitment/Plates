const KEY = 'plates_recent_searches'
const MAX = 6

export function getRecentSearches() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// most-recent-first, deduped case-insensitively, capped at MAX -- same
// "worst case it just doesn't persist" tolerance as the other localStorage
// helpers in this app (browseFilters.js, onboarding.js)
export function addRecentSearch(query) {
  const trimmed = query.trim()
  if (!trimmed) return
  try {
    const existing = getRecentSearches().filter((q) => q.toLowerCase() !== trimmed.toLowerCase())
    const next = [trimmed, ...existing].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export function clearRecentSearches() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
