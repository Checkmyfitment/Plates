import { supabase } from './supabaseClient'

export async function fetchFollowedSellerIds(userId) {
  const { data, error } = await supabase
    .from('seller_follows')
    .select('seller_id')
    .eq('follower_id', userId)
  if (error) throw error
  return data.map((r) => r.seller_id)
}

export async function followSeller(followerId, sellerId) {
  const { error } = await supabase
    .from('seller_follows')
    .insert({ follower_id: followerId, seller_id: sellerId })
  if (error) throw error
}

export async function unfollowSeller(followerId, sellerId) {
  const { error } = await supabase
    .from('seller_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('seller_id', sellerId)
  if (error) throw error
}

export async function fetchFollowedSellers(userId) {
  const { data, error } = await supabase
    .from('seller_follows')
    .select('seller:profiles!seller_follows_seller_id_fkey(id, name, avatar_url, neighborhood)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((r) => ({
    id: r.seller.id,
    name: r.seller.name,
    avatarUrl: r.seller.avatar_url,
    neighborhood: r.seller.neighborhood,
  }))
}
