import { supabase } from './supabaseClient'

export async function fetchFavoriteIds(userId) {
  const { data, error } = await supabase.from('favorites').select('listing_id').eq('user_id', userId)
  if (error) throw error
  return new Set(data.map((r) => r.listing_id))
}

export async function addFavorite(userId, listingId) {
  const { error } = await supabase.from('favorites').insert({ user_id: userId, listing_id: listingId })
  if (error) throw error
}

export async function removeFavorite(userId, listingId) {
  const { error } = await supabase.from('favorites').delete().eq('user_id', userId).eq('listing_id', listingId)
  if (error) throw error
}
