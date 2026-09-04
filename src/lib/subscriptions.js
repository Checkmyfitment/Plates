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

// a seller's standing (recurring) orders, one row per active subscriber —
// used to roll up "how many people have a standing order for this dish,
// and when's the next one due" ahead of the orders actually landing
export async function fetchSellerStandingOrders(sellerId) {
  const { data, error } = await supabase
    .from('listing_subscriptions')
    .select(
      'id, listing_id, quantity, interval_days, next_order_date, listing:listings(title), buyer:profiles!listing_subscriptions_buyer_id_fkey(name)'
    )
    .eq('seller_id', sellerId)
    .eq('active', true)
    .order('next_order_date', { ascending: true })
  if (error) throw error
  return data.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? 'Listing',
    buyerName: row.buyer?.name ?? 'A neighbor',
    quantity: row.quantity,
    intervalDays: row.interval_days,
    nextOrderDate: row.next_order_date,
  }))
}

// rolls fetchSellerStandingOrders() up per listing: subscriber count, total
// quantity per cycle, and the soonest date any of them is next due
export function summarizeStandingOrdersByListing(standingOrders) {
  const byListing = new Map()
  for (const s of standingOrders) {
    const entry = byListing.get(s.listingId) ?? {
      listingId: s.listingId,
      listingTitle: s.listingTitle,
      subscriberCount: 0,
      totalQuantity: 0,
      nextOrderDate: s.nextOrderDate,
    }
    entry.subscriberCount += 1
    entry.totalQuantity += s.quantity
    if (s.nextOrderDate < entry.nextOrderDate) entry.nextOrderDate = s.nextOrderDate
    byListing.set(s.listingId, entry)
  }
  return [...byListing.values()].sort((a, b) => (a.nextOrderDate < b.nextOrderDate ? -1 : 1))
}
