// Lightweight, computed-from-existing-data seller recognition badges —
// no separate "verification" workflow, just a friendly signal based on
// rating history (similar in spirit to Etsy's Star Seller badge).
//
// sellerTrust (optional, from seller_trust_stats) adds a higher tier that
// — unlike "Community favorite" — also requires a real completion track
// record (no no-shows, 90%+ of orders actually completed), not just a
// good average rating from however many reviews happened to come in.
export function getSellerBadge(sellerRating, sellerTrust) {
  if (sellerTrust?.isTopRated) {
    return { icon: '🏆', label: 'Top rated' }
  }
  if (sellerRating && sellerRating.avgRating >= 4.8 && sellerRating.reviewCount >= 5) {
    return { icon: '🌟', label: 'Community favorite' }
  }
  if (!sellerRating || sellerRating.reviewCount === 0) {
    return { icon: '🌱', label: 'New neighbor' }
  }
  return null
}

// Non-monetary recognition for referrals — no credits or payments involved,
// just a badge once enough neighbors have joined from someone's invite link.
export function getReferralBadge(referralCount) {
  if (referralCount >= 3) {
    return { icon: '🎉', label: 'Community Builder' }
  }
  return null
}
