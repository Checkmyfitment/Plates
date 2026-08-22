const KEY = 'plates_browse_filters'

export function getSavedBrowseFilters() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveBrowseFilters(filters) {
  try {
    localStorage.setItem(KEY, JSON.stringify(filters))
  } catch {
    // ignore — worst case filters just don't persist
  }
}
