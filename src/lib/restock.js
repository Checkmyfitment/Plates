import { supabase } from './supabaseClient'

export async function fetchRestockIds(userId) {
  const { data, error } = await supabase.from('restock_alerts').select('listing_id').eq('buyer_id', userId)
  if (error) throw error
  return new Set(data.map((r) => r.listing_id))
}

export async function addRestockAlert(userId, listingId) {
  const { error } = await supabase.from('restock_alerts').insert({ buyer_id: userId, listing_id: listingId })
  if (error) throw error
}

export async function removeRestockAlert(userId, listingId) {
  const { error } = await supabase.from('restock_alerts').delete().eq('buyer_id', userId).eq('listing_id', listingId)
  if (error) throw error
}

export async function fetchRestockCounts() {
  const { data, error } = await supabase.from('restock_counts').select('listing_id, waiting_count')
  if (error) throw error
  return new Map(data.map((r) => [r.listing_id, r.waiting_count]))
}
