import { supabase } from './supabaseClient'

function mapSubscription(row) {
  const listing = row.listing ?? {}
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: listing.title ?? 'Listing',
    photo: listing.photo,
    photoUrl: listing.photo_url,
    bg: listing.bg,
    sellerName: listing.seller?.name ?? 'Seller',
    quantity: row.quantity,
    intervalDays: row.interval_days,
    fulfillmentMethod: row.fulfillment_method,
    nextOrderDate: row.next_order_date,
    active: row.active,
  }
}

export async function createSubscription({ listingId, buyerId, sellerId, quantity, intervalDays, fulfillmentMethod, deliveryAddress }) {
  const { error } = await supabase.from('listing_subscriptions').insert({
    listing_id: listingId,
    buyer_id: buyerId,
    seller_id: sellerId,
    quantity,
    interval_days: intervalDays,
    fulfillment_method: fulfillmentMethod,
    delivery_address: deliveryAddress || null,
    next_order_date: new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  })
  if (error) throw error
}

export async function fetchMySubscriptions(buyerId) {
  const { data, error } = await supabase
    .from('listing_subscriptions')
    .select('id, listing_id, quantity, interval_days, fulfillment_method, next_order_date, active, listing:listings(title, photo, photo_url, bg, seller:profiles!listings_seller_id_fkey(name))')
    .eq('buyer_id', buyerId)
    .eq('active', true)
    .order('next_order_date', { ascending: true })
  if (error) throw error
  return data.map(mapSubscription)
}

export async function cancelSubscription(id) {
  const { error } = await supabase
    .from('listing_subscriptions')
    .update({ active: false, cancelled_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}
