import { useEffect, useState } from 'react'
import { fetchSellerReviews } from '../lib/reviews'
import { fetchFollowedSellerIds, followSeller, unfollowSeller } from '../lib/follows'
import { fetchCompletedOrderCount } from '../lib/orders'
import ReviewItem from './ReviewItem'
import { useToast } from '../context/ToastContext'

export default function SellerCard({
  sellerId,
  sellerName,
  sellerAvatar,
  sellerNeighborhood,
  sellerKitchen,
  sellerPhoneVerified,
  cottageLawVerified,
  badge,
  responseStats,
  formatResponseTime,
  sellerRating,
  currentUserId,
  onOpenSeller,
  onRequireAuth,
}) {
  const toast = useToast()
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [reviewsOpen, setReviewsOpen] = useState(false)
  const [reviews, setReviews] = useState(null)
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [orderCount, setOrderCount] = useState(0)

  useEffect(() => {
    if (!currentUserId) return
    fetchFollowedSellerIds(currentUserId)
      .then((ids) => setIsFollowing(ids.includes(sellerId)))
      .catch((err) => console.error('Failed to load follow state', err))
  }, [sellerId, currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    fetchCompletedOrderCount(currentUserId, sellerId)
      .then(setOrderCount)
      .catch((err) => console.error('Failed to load order count', err))
  }, [sellerId, currentUserId])

  const toggleFollow = async () => {
    if (!currentUserId) {
      onRequireAuth?.()
      return
    }
    if (followBusy) return
    setFollowBusy(true)
    try {
      if (isFollowing) {
        await unfollowSeller(currentUserId, sellerId)
        setIsFollowing(false)
      } else {
        await followSeller(currentUserId, sellerId)
        setIsFollowing(true)
        toast.success(`Following ${sellerName}`)
      }
    } catch (err) {
      console.error('Failed to toggle follow', err)
      toast.error('Something went wrong — try again.')
    } finally {
      setFollowBusy(false)
    }
  }

  const toggleReviews = async () => {
    if (reviewsOpen) {
      setReviewsOpen(false)
      return
    }
    setReviewsOpen(true)
    if (reviews !== null) return
    setReviewsLoading(true)
    try {
      setReviews(await fetchSellerReviews(sellerId))
    } catch (err) {
      console.error('Failed to load reviews', err)
      toast.error('Could not load reviews — try again.')
      setReviewsOpen(false)
    } finally {
      setReviewsLoading(false)
    }
  }

  return (
    <div className="mt-4 card-elevated p-3.5">
      <div className="flex items-center gap-3">
        <button onClick={onOpenSeller} className="pressable flex items-center gap-3 flex-1 min-w-0 text-left">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-medium overflow-hidden shrink-0"
            style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
          >
            {sellerAvatar ? (
              <img src={sellerAvatar} alt={sellerName} className="w-full h-full object-cover" />
            ) : (
              sellerName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate hover:underline">{sellerName}</p>
            {sellerNeighborhood && (
              <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
                {sellerNeighborhood}
              </p>
            )}
          </div>
        </button>
        <button
          onClick={toggleFollow}
          disabled={followBusy}
          className="pressable text-xs px-3 py-1.5 rounded-full font-medium shrink-0 disabled:opacity-60"
          style={
            isFollowing
              ? { border: '1px solid var(--rule)', color: 'var(--ink)' }
              : { background: 'var(--forest)', color: 'white' }
          }
        >
          {isFollowing ? '✓ Following' : '+ Follow'}
        </button>
      </div>

      <div className="flex items-center flex-wrap gap-1.5 mt-2.5">
        {badge && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
          >
            {badge.icon} {badge.label}
          </span>
        )}
        {sellerPhoneVerified && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
            📱 Phone verified
          </span>
        )}
        {cottageLawVerified && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
            📋 Cottage law confirmed
          </span>
        )}
        {responseStats && responseStats.responseCount >= 3 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--paper-dim)', color: 'var(--ink-soft)' }}>
            ⚡ Usually replies within {formatResponseTime(responseStats.avgResponseMinutes)}
          </span>
        )}
        {orderCount >= 2 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}>
            🔁 Ordered {orderCount} times
          </span>
        )}
      </div>

      {sellerKitchen && (
        <p className="text-sm mt-2.5 leading-relaxed">{sellerKitchen}</p>
      )}

      {sellerRating?.avgTaste != null && (
        <p className="text-[11px] mt-2" style={{ color: 'var(--ink-soft)' }}>
          Taste {sellerRating.avgTaste} · Portion {sellerRating.avgPortion} · Value {sellerRating.avgValue}
        </p>
      )}

      <button onClick={toggleReviews} className="pressable text-xs font-medium mt-3 hover:underline" style={{ color: 'var(--forest-dark)' }}>
        {reviewsOpen ? 'Hide reviews' : sellerRating ? `See reviews (★ ${sellerRating.avgRating} · ${sellerRating.reviewCount})` : 'See reviews'}
      </button>

      {reviewsOpen && (
        <div className="flex flex-col gap-2 mt-2.5">
          {reviewsLoading ? (
            <>
              <div className="skeleton h-16 w-full rounded-xl" />
              <div className="skeleton h-16 w-full rounded-xl" />
            </>
          ) : reviews?.length === 0 ? (
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              No reviews yet.
            </p>
          ) : (
            reviews?.map((r) => (
              <ReviewItem key={r.id} review={r} isSeller={currentUserId === sellerId} />
            ))
          )}
        </div>
      )}
    </div>
  )
}
