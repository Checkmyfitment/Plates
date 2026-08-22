import { supabase } from './supabaseClient'
import { setListingFeatured } from './admin'

function mapRequest(row) {
  return {
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing?.title ?? 'A listing',
    sellerId: row.seller_id,
    sellerName: row.seller?.name ?? 'A neighbor',
    status: row.status,
    createdAt: row.created_at,
  }
}

const REQUEST_SELECT = `
  id, listing_id, seller_id, status, created_at,
  listing:listings(title),
  seller:profiles!promotion_requests_seller_id_fkey(name)
`

export async function requestPromotion(listingId, sellerId) {
  const { error } = await supabase.from('promotion_requests').insert({ listing_id: listingId, seller_id: sellerId })
  if (error) throw error
}

export async function fetchMyPromotionRequest(listingId, sellerId) {
  const { data, error } = await supabase
    .from('promotion_requests')
    .select(REQUEST_SELECT)
    .eq('listing_id', listingId)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data ? mapRequest(data) : null
}

export async function fetchPendingPromotionRequests() {
  const { data, error } = await supabase
    .from('promotion_requests')
    .select(REQUEST_SELECT)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data.map(mapRequest)
}

export async function approvePromotionRequest(requestId, listingId) {
  const { error } = await supabase
    .from('promotion_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
  await setListingFeatured(listingId, true)
}

export async function rejectPromotionRequest(requestId) {
  const { error } = await supabase
    .from('promotion_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}
