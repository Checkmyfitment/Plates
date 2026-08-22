import { supabase } from './supabaseClient'

export async function fetchFollowedCuisines(userId) {
  const { data, error } = await supabase.from('listing_alerts').select('cuisine').eq('user_id', userId)
  if (error) throw error
  return new Set(data.map((row) => row.cuisine))
}

export async function followCuisine(userId, cuisine) {
  const { error } = await supabase.from('listing_alerts').insert({ user_id: userId, cuisine })
  if (error) throw error
}

export async function unfollowCuisine(userId, cuisine) {
  const { error } = await supabase.from('listing_alerts').delete().eq('user_id', userId).eq('cuisine', cuisine)
  if (error) throw error
}
