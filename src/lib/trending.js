import { supabase } from './supabaseClient'
import { distanceMiles } from './geo'

const NEARBY_RADIUS_MILES = 25

function mapRow(row) {
  return {
    sellerId: row.seller_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    kitchen: row.kitchen,
    neighborhood: row.neighborhood,
    lat: row.lat,
    lng: row.lng,
    trendingScore: row.trending_score,
  }
}

// Fetches the top-20 trending sellers and narrows to a final top-5. With no
// location, that's just the highest-scoring 5. With one, nearby sellers
// (within NEARBY_RADIUS_MILES) are preferred — still ranked by trending
// score among themselves — and only padded with farther-away sellers if
// fewer than 5 are nearby, so the row never looks sparse.
export async function fetchTrendingSellers(userLocation) {
  const { data, error } = await supabase.from('trending_sellers').select('*')
  if (error) throw error
  const rows = data.map(mapRow)

  if (!userLocation) {
    return { sellers: rows.slice(0, 5).map((r, i) => ({ ...r, rank: i + 1 })), nearby: false }
  }

  const withDistance = rows.map((r) => ({
    ...r,
    distance: r.lat != null && r.lng != null ? distanceMiles(userLocation.lat, userLocation.lng, r.lat, r.lng) : null,
  }))
  const near = withDistance.filter((r) => r.distance != null && r.distance <= NEARBY_RADIUS_MILES)
  const far = withDistance.filter((r) => r.distance == null || r.distance > NEARBY_RADIUS_MILES)

  const combined = [...near, ...far].slice(0, 5)
  return { sellers: combined.map((r, i) => ({ ...r, rank: i + 1 })), nearby: near.length > 0 }
}
