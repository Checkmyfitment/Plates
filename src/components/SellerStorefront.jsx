import { useEffect, useState } from 'react'
import ListingCard from './ListingCard'
import Placeholder from './Placeholder'
import { getSellerBadge } from '../lib/badges'
import { fetchProfile } from '../lib/profiles'
import { fetchSellerReviews } from '../lib/reviews'
import { fetchFollowedSellerIds, followSeller, unfollowSeller } from '../lib/follows'
import { fetchCompletedOrderCount } from '../lib/orders'
import { isOrderingClosed } from '../lib/listings'
import { shareLink } from '../lib/share'
import { useToast } from '../context/ToastContext'
import ReviewItem from './ReviewItem'
import ReportModal from './ReportModal'

function StorefrontListingTile({ listing, quantity, onIncrement, onDecrement, onOpen }) {
  const manuallySold = listing.available === false
  const closed = isOrderingClosed(listing)
  const sold = manuallySold || listing.sellerOnVacation || closed
  const atMax = listing.quantityAvailable != null && quantity >= listing.quantityAvailable
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--card)]" style={{ opacity: sold ? 0.6 : 1, boxShadow: 'var(--shadow-card)' }}>
      <button onClick={() => onOpen(listing)} className="block w-full text-left">
        <div className="h-24 flex items-center justify-center text-4xl" style={{ background: listing.bg }}>
          {listing.photoUrl ? (
            <img src={listing.photoUrl} alt={listing.title} className="w-full h-full object-cover" />
          ) : (
            listing.photo
          )}
        </div>
        <div className="px-2 pt-2">
          <p className="text-xs font-bold truncate">{listing.title}</p>
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--ink-soft)' }}>
            ${listing.price}
          </p>
        </div>
      </button>
      <div className="flex items-center justify-center gap-2 px-2 py-2">
        {sold ? (
          <span className="text-[10px] font-medium" style={{ color: 'var(--ink-soft)' }}>
            {manuallySold ? 'Sold out' : closed ? 'Orders closed' : '🏖️ Away'}
          </span>
        ) : quantity > 0 ? (
          <>
            <button
              onClick={onDecrement}
              aria-label="Decrease quantity"
              className="pressable w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold"
              style={{ borderColor: 'var(--rule)' }}
            >
              −
            </button>
            <span className="text-xs font-medium w-4 text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {quantity}
            </span>
            <button
              onClick={onIncrement}
              disabled={atMax}
              aria-label="Increase quantity"
              className="pressable w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold disabled:opacity-40"
              style={{ borderColor: 'var(--rule)' }}
            >
              +
            </button>
          </>
        ) : (
          <button
            onClick={onIncrement}
            className="pressable text-xs px-3 py-1 rounded-full font-medium"
            style={{ background: 'var(--forest)', color: 'white' }}
          >
            + Add
          </button>
        )}
      </div>
    </div>
  )
}

export default function SellerStorefront({
  sellerId,
  currentUserId,
  listings,
  favoriteIds,
  onToggleFavoriteListing,
  sellerRating,
  sellerTrust,
  onBack,
  onSelectListing,
  onRequireAuth,
  onPlaceCartOrder,
}) {
  const toast = useToast()
  const [seller, setSeller] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [orderCount, setOrderCount] = useState(0)
  const [cart, setCart] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [cartFulfillment, setCartFulfillment] = useState('pickup')
  const [cartDeliveryAddress, setCartDeliveryAddress] = useState('')

  const isOwn = currentUserId === sellerId

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchProfile(sellerId), fetchSellerReviews(sellerId)])
      .then(([profile, reviewList]) => {
        setSeller(profile)
        setReviews(reviewList)
      })
      .catch((err) => console.error('Failed to load seller storefront', err))
      .finally(() => setLoading(false))
  }, [sellerId])

  useEffect(() => {
    if (isOwn || !currentUserId) return
    fetchFollowedSellerIds(currentUserId)
      .then((ids) => setIsFollowing(ids.includes(sellerId)))
      .catch((err) => console.error('Failed to load follow state', err))
  }, [sellerId, currentUserId, isOwn])

  useEffect(() => {
    if (isOwn || !currentUserId) return
    fetchCompletedOrderCount(currentUserId, sellerId)
      .then(setOrderCount)
      .catch((err) => console.error('Failed to load order count', err))
  }, [sellerId, currentUserId, isOwn])

  const sellerListings = listings.filter((l) => l.sellerId === sellerId && !l.unclaimedStoreId)
  const sellerListingsMap = new Map(sellerListings.map((l) => [l.id, l]))
  const badge = getSellerBadge(sellerRating, sellerTrust)

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
        toast.success(`Following ${seller?.name ?? 'this kitchen'}`)
      }
    } catch (err) {
      console.error('Failed to toggle follow', err)
      toast.error('Something went wrong — try again.')
    } finally {
      setFollowBusy(false)
    }
  }

  const copyProfileLink = async () => {
    const link = `${window.location.origin}${window.location.pathname}?seller=${sellerId}`
    try {
      const result = await shareLink({
        url: link,
        title: seller?.name ? `${seller.name} on Plates` : 'Plates',
        text: seller?.name ? `Check out ${seller.name}'s kitchen on Plates` : 'Check out this kitchen on Plates',
      })
      if (result === 'copied') toast.success('Profile link copied!')
    } catch (err) {
      console.error('Failed to share profile link', err)
      toast.error('Could not share that — try again.')
    }
  }

  const changeQuantity = (listingId, delta) => {
    if (!currentUserId) {
      onRequireAuth?.()
      return
    }
    const available = sellerListingsMap.get(listingId)?.quantityAvailable
    setCart((prev) => {
      let next = Math.max(0, (prev[listingId] ?? 0) + delta)
      if (available != null) next = Math.min(next, available)
      const updated = { ...prev }
      if (next === 0) delete updated[listingId]
      else updated[listingId] = next
      return updated
    })
  }

  const cartItems = Object.entries(cart)
    .map(([listingId, quantity]) => ({ listing: sellerListingsMap.get(listingId), quantity }))
    .filter((item) => item.listing)
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.listing.price * item.quantity, 0)
  const cartDeliveryAvailable = cartItems.some((item) => item.listing.deliveryAvailable)
  const cartNeedsAddress = cartDeliveryAvailable && cartFulfillment === 'delivery'

  const submitCart = async () => {
    if (cartItems.length === 0 || submitting) return
    if (cartNeedsAddress && !cartDeliveryAddress.trim()) return
    setSubmitting(true)
    try {
      const ok = await onPlaceCartOrder(
        cartItems.map((item) => ({ listingId: item.listing.id, quantity: item.quantity, priceAtOrder: item.listing.price })),
        cartDeliveryAvailable ? cartFulfillment : 'pickup',
        cartDeliveryAddress.trim(),
      )
      if (ok) {
        setCart({})
        setCartFulfillment('pickup')
        setCartDeliveryAddress('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="px-5 pt-6">
        <div className="skeleton h-24 w-full mb-4" />
        <div className="skeleton h-40 w-full" />
      </div>
    )
  }

  if (!seller) {
    return <Placeholder icon="🍽️" title="Couldn't find that seller" body="They may have deleted their account." />
  }

  return (
    <div className="pb-4">
      <div className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            aria-label="Back"
            className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
            style={{ color: 'var(--forest-dark)' }}
          >
            ←
          </button>
        </div>
        <button
          onClick={copyProfileLink}
          className="pressable text-xs px-3 py-1.5 rounded-full border font-medium"
          style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
        >
          {isOwn ? 'Share profile' : 'Share'}
        </button>
      </div>

      <div className="px-5">
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-medium overflow-hidden shrink-0"
            style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
          >
            {seller.avatar_url ? (
              <img src={seller.avatar_url} alt={seller.name} className="w-full h-full object-cover" />
            ) : (
              seller.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xl truncate" style={{ color: 'var(--forest-dark)' }}>
              {seller.name}
            </h2>
            {seller.neighborhood && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                {seller.neighborhood}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {badge && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
                >
                  {badge.icon} {badge.label}
                </span>
              )}
              {sellerRating && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--paper-dim)', color: 'var(--ink)' }}>
                  ★ {sellerRating.avgRating} ({sellerRating.reviewCount})
                </span>
              )}
              {badge?.icon === '🏆' && sellerTrust?.completionRate != null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--paper-dim)', color: 'var(--ink)' }}>
                  {sellerTrust.completionRate}% completion · {sellerTrust.completedCount} orders
                </span>
              )}
              {seller.phone_verified && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
                  📱 Phone verified
                </span>
              )}
              {orderCount >= 2 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}>
                  🔁 Ordered {orderCount} times
                </span>
              )}
              {seller.on_vacation && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
                  🏖️ Away
                </span>
              )}
            </div>
          </div>
        </div>

        {!isOwn && (
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={toggleFollow}
              disabled={followBusy}
              className="pressable text-xs px-4 py-2 rounded-full font-medium disabled:opacity-60"
              style={
                isFollowing
                  ? { border: '1px solid var(--rule)', color: 'var(--ink)' }
                  : { background: 'var(--forest)', color: 'white' }
              }
            >
              {isFollowing ? '✓ Following' : '+ Follow'}
            </button>
            <button
              onClick={() => (currentUserId ? setReporting(true) : onRequireAuth?.())}
              className="pressable text-xs px-2 py-1"
              style={{ color: 'var(--ink-soft)' }}
            >
              🚩 Report
            </button>
          </div>
        )}

        {seller.kitchen && (
          <p className="text-sm mt-3 leading-relaxed" style={{ color: 'var(--ink)' }}>
            {seller.kitchen}
          </p>
        )}

        {sellerRating?.avgTaste != null && (
          <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
            Taste {sellerRating.avgTaste} · Portion {sellerRating.avgPortion} · Value {sellerRating.avgValue}
          </p>
        )}

        <div className="flex items-center justify-between mb-2 mt-5">
          <h3 className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
            Listings
          </h3>
          {!isOwn && sellerListings.length > 1 && (
            <span className="text-[10px]" style={{ color: 'var(--ink-soft)' }}>
              Tap + to order more than one item
            </span>
          )}
        </div>
        {sellerListings.length === 0 ? (
          <Placeholder compact icon="🍽️" title="Nothing posted yet" body="Check back soon." />
        ) : isOwn ? (
          <div className="grid grid-cols-2 gap-3">
            {sellerListings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                onSelect={onSelectListing}
                isFavorite={favoriteIds?.has(l.id)}
                onToggleFavorite={onToggleFavoriteListing}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sellerListings.map((l) => (
              <StorefrontListingTile
                key={l.id}
                listing={l}
                quantity={cart[l.id] ?? 0}
                onIncrement={() => changeQuantity(l.id, 1)}
                onDecrement={() => changeQuantity(l.id, -1)}
                onOpen={onSelectListing}
              />
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <>
            <h3 className="text-xs font-medium mb-2 mt-5" style={{ color: 'var(--ink-soft)' }}>
              Reviews
            </h3>
            <div className="flex flex-col gap-2">
              {reviews.map((r) => (
                <ReviewItem key={r.id} review={r} isSeller={currentUserId === sellerId} />
              ))}
            </div>
          </>
        )}
      </div>

      {cartCount > 0 && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-[416px] rounded-2xl border bg-[var(--card)] p-3 flex flex-col gap-2 z-30"
          style={{ borderColor: 'var(--rule)', boxShadow: 'var(--shadow-float)' }}
        >
          {cartDeliveryAvailable && (
            <div className="flex gap-2">
              {['pickup', 'delivery'].map((option) => (
                <button
                  key={option}
                  onClick={() => setCartFulfillment(option)}
                  className="pressable flex-1 py-1.5 rounded-lg text-[11px] font-bold capitalize border"
                  style={
                    cartFulfillment === option
                      ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                      : { borderColor: 'var(--rule)', color: 'var(--ink)' }
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          )}
          {cartNeedsAddress && (
            <input
              value={cartDeliveryAddress}
              onChange={(e) => setCartDeliveryAddress(e.target.value)}
              placeholder="Delivery address"
              className="field text-sm w-full"
            />
          )}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold">
              {cartCount} item{cartCount === 1 ? '' : 's'} · ${cartTotal.toFixed(2)}
            </p>
            <button
              onClick={submitCart}
              disabled={submitting || (cartNeedsAddress && !cartDeliveryAddress.trim())}
              className="pressable text-xs px-4 py-2 rounded-full font-bold disabled:opacity-60"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              {submitting ? 'Placing…' : 'Place order'}
            </button>
          </div>
        </div>
      )}

      {reporting && (
        <ReportModal
          reporterId={currentUserId}
          listingId={null}
          reportedUserId={sellerId}
          title={`Report ${seller?.name ?? 'this seller'}`}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}
