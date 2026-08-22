// Turns a typed area like "Highland Park, 90042" into approximate coordinates,
// using OpenStreetMap's free Nominatim search — no API key required.
// Returns null (instead of throwing) if it can't find a match, so a bad
// location string never blocks saving a profile.
export async function geocodeArea(query) {
  const trimmed = query.trim()
  if (!trimmed) return null

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!res.ok) return null
    const results = await res.json()
    if (!results.length) return null
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) }
  } catch {
    return null
  }
}
