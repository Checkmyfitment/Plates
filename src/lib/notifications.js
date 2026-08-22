import { supabase } from './supabaseClient'

function mapNotification(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    message: row.message,
    read: row.read,
    createdAt: row.created_at,
  }
}

export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data.map(mapNotification)
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error) throw error
}

// notifies everyone who's completed an order with the calling seller —
// returns how many buyers it reached
export async function broadcastToBuyers(message) {
  const { data, error } = await supabase.rpc('broadcast_to_buyers', { p_message: message })
  if (error) throw error
  return data
}
