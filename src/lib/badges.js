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

// true only when every one of the seller's own listings has confirmed
// cottage law compliance — an honest all-or-nothing signal (same spirit as
// the trust badge's own strict thresholds), rather than claiming a seller
// is "compliant" when only some of their listings have confirmed it
export function hasCottageLawConfirmed(listings) {
  return listings.length > 0 && listings.every((l) => l.cottageLawConfirmed)
}

// Non-monetary recognition for referrals — no credits or payments involved,
// just a badge once enough neighbors have joined from someone's invite link.
export function getReferralBadge(referralCount) {
  if (referralCount >= 3) {
    return { icon: '🎉', label: 'Community Builder' }
  }
  return null
}

// Separate, narrower recognition for a referral that did more than add one
// more user — it brought an active seller into a neighborhood that had
// real, demonstrated demand (an area waitlist signup there) but no seller
// yet. Distinct from Community Builder on purpose: that one rewards
// volume, this one rewards where the referral actually landed. A single
// pioneer referral is already a meaningful thing to have caused, so the
// threshold is 1, not 3.
export function getPioneerBadge(pioneerReferralCount) {
  if (pioneerReferralCount >= 1) {
    return { icon: '🧭', label: 'Neighborhood Pioneer' }
  }
  return null
}
