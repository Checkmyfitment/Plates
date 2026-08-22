import { supabase } from './supabaseClient'

export async function fetchSellerRatings() {
  const { data, error } = await supabase.from('seller_ratings').select('*')
  if (error) throw error
  const map = new Map()
  data.forEach((row) => {
    map.set(row.seller_id, {
      avgRating: Number(row.avg_rating),
      reviewCount: row.review_count,
      avgTaste: row.avg_taste != null ? Number(row.avg_taste) : null,
      avgPortion: row.avg_portion != null ? Number(row.avg_portion) : null,
      avgValue: row.avg_value != null ? Number(row.avg_value) : null,
    })
  })
  return map
}

export async function fetchSellerTrustStats() {
  const { data, error } = await supabase.from('seller_trust_stats').select('*')
  if (error) throw error
  const map = new Map()
  data.forEach((row) => {
    map.set(row.seller_id, {
      completedCount: row.completed_count,
      noShowCount: row.no_show_count,
      completionRate: row.completion_rate != null ? Number(row.completion_rate) : null,
      isTopRated: row.is_top_rated,
    })
  })
  return map
}

export async function fetchSellerReviews(sellerId) {
  const { data, error } = await supabase
    .from('reviews')
    .select(
      `id, rating, comment, taste_rating, portion_rating, value_rating, created_at,
       seller_reply, seller_reply_at,
       reviewer:profiles!reviews_reviewer_id_fkey(name, avatar_url)`,
    )
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    tasteRating: r.taste_rating,
    portionRating: r.portion_rating,
    valueRating: r.value_rating,
    createdAt: r.created_at,
    reviewerName: r.reviewer?.name ?? 'A neighbor',
    reviewerAvatar: r.reviewer?.avatar_url ?? null,
    sellerReply: r.seller_reply,
    sellerReplyAt: r.seller_reply_at,
  }))
}

export async function replyToReview(reviewId, reply) {
  const { error } = await supabase.rpc('reply_to_review', { p_review_id: reviewId, p_reply: reply })
  if (error) throw error
}

export async function fetchMyReview(sellerId, reviewerId) {
  const { data, error } = await supabase
    .from('reviews')
    .select('rating, comment, taste_rating, portion_rating, value_rating')
    .eq('seller_id', sellerId)
    .eq('reviewer_id', reviewerId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertReview({ sellerId, reviewerId, listingId, rating, comment, tasteRating, portionRating, valueRating }) {
  const { error } = await supabase
    .from('reviews')
    .upsert(
      {
        seller_id: sellerId,
        reviewer_id: reviewerId,
        listing_id: listingId,
        rating,
        comment: comment || null,
        taste_rating: tasteRating,
        portion_rating: portionRating,
        value_rating: valueRating,
      },
      { onConflict: 'seller_id,reviewer_id' },
    )
  if (error) throw error
}
