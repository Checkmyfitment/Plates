import { supabase } from './supabaseClient'

// Returns a Map<sellerId, { avgResponseMinutes, responseCount }>
export async function fetchResponseStats() {
  const { data, error } = await supabase.from('seller_response_stats').select('*')
  if (error) throw error
  const map = new Map()
  data.forEach((row) => {
    map.set(row.seller_id, {
      avgResponseMinutes: Number(row.avg_response_minutes),
      responseCount: row.response_count,
    })
  })
  return map
}

// Turns a minute count into a friendly label like the ones Etsy/Depop show.
export function formatResponseTime(minutes) {
  if (minutes < 60) return 'a few minutes'
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}
