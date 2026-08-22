import { supabase } from './supabaseClient'

function mapChat(row, currentUserId) {
  const listing = row.listing ?? {}
  const isSeller = listing.seller_id === currentUserId
  const counterpartName = isSeller ? (row.buyer?.name ?? 'Buyer') : (listing.seller?.name ?? 'Seller')
  const lastRead = isSeller ? row.seller_last_read_at : row.buyer_last_read_at
  const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0

  const sortedMessages = (row.messages ?? [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  const unreadCount = sortedMessages.filter(
    (m) => m.sender_id !== currentUserId && new Date(m.created_at).getTime() > lastReadTime,
  ).length

  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: listing.title ?? 'Listing',
    seller: counterpartName,
    counterpartId: isSeller ? row.buyer_id : listing.seller_id,
    photo: listing.photo,
    photoUrl: listing.photo_url,
    bg: listing.bg,
    isSeller,
    unreadCount,
    messages: sortedMessages.map((m) => ({
      id: m.id,
      from: m.sender_id === currentUserId ? 'me' : 'seller',
      text: m.text,
      photoUrl: m.photo_url,
    })),
  }
}

export async function fetchChats(userId) {
  const { data, error } = await supabase
    .from('chats')
    .select(
      `id, listing_id, buyer_id, buyer_last_read_at, seller_last_read_at,
       buyer:profiles!chats_buyer_id_fkey(name),
       listing:listings(title, photo, photo_url, bg, seller_id, seller:profiles!listings_seller_id_fkey(name)),
       messages(id, sender_id, text, photo_url, created_at)`,
    )
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((row) => mapChat(row, userId)).filter((c) => c.messages.length > 0)
}

export async function markChatRead(chatId, isSeller) {
  const column = isSeller ? 'seller_last_read_at' : 'buyer_last_read_at'
  const { error } = await supabase
    .from('chats')
    .update({ [column]: new Date().toISOString() })
    .eq('id', chatId)
  if (error) throw error
}

export async function startOrGetChat(listing, buyerId) {
  const { data: existing, error: findErr } = await supabase
    .from('chats')
    .select('id')
    .eq('listing_id', listing.id)
    .eq('buyer_id', buyerId)
    .maybeSingle()
  if (findErr) throw findErr
  if (existing) return existing.id

  const { data, error } = await supabase
    .from('chats')
    .insert({ listing_id: listing.id, buyer_id: buyerId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function sendMessage(chatId, senderId, text, photoUrl) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, sender_id: senderId, text: text || null, photo_url: photoUrl || null })
    .select()
    .single()
  if (error) throw error
  return { id: data.id, from: 'me', text: data.text, photoUrl: data.photo_url }
}
