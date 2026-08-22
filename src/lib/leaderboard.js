import { supabase } from './supabaseClient'

// Top kitchens (by completed orders in the last 30 days) within one
// neighborhood — a lightweight "top 3 near you" instead of a global
// leaderboard, since a citywide ranking would just be dominated by whoever
// has the most listings rather than being a locally meaningful signal.
export async function fetchNeighborhoodLeaderboard(neighborhood) {
  if (!neighborhood) return []
  const { data, error } = await supabase
    .from('neighborhood_leaderboard')
    .select('*')
    .eq('neighborhood', neighborhood)
    .order('completed_last_30d', { ascending: false })
    .limit(3)
  if (error) throw error
  return data.map((row, i) => ({
    sellerId: row.seller_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    completedLast30d: row.completed_last_30d,
    rank: i + 1,
  }))
}
