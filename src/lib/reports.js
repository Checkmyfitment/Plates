import { supabase } from './supabaseClient'

export async function submitReport({ reporterId, listingId, reportedUserId, reason, details }) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    listing_id: listingId ?? null,
    reported_user_id: reportedUserId ?? null,
    reason,
    details: details || null,
  })
  if (error) throw error
}
