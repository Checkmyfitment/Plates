import { useEffect, useState } from 'react'
import SellerRatingForm from './SellerRatingForm'
import SellerCard from './SellerCard'
import ListingCard from './ListingCard'
import ReportModal from './ReportModal'
import PickupSlotPicker from './PickupSlotPicker'
import OrderAheadPicker from './OrderAheadPicker'
import PlaceOrderForm from './PlaceOrderForm'
import PromotionRequestCard from './PromotionRequestCard'
import { getSellerBadge, hasCottageLawConfirmed } from '../lib/badges'
import { formatResponseTime } from '../lib/responseStats'
import { incrementListingViews, getListingShareLink, formatPickupTime, isOrderingClosed } from '../lib/listings'
import { shareLink } from '../lib/share'
import { addRecentlyViewed } from '../lib/recentlyViewed'
import { setListingFeatured } from '../lib/admin'
import { useToast } from '../context/ToastContext'

export default function ListingDetail({
  listing,
  onBack,
  isFavorite,
  onToggleFavorite,
  onMessageSeller,
  sellerRating,
  sellerTrust,
  currentUserId,
  onRatingSaved,
  moreFromSeller = [],
  onSelectListing,
  favoriteIds,
  onToggleFavoriteListing,
  onEditListing,
  restockRequested,
  onToggleRestockAlert,
  restockCount = 0,
  responseStats,
  isAdmin,
  onFeaturedChanged,
  onOpenSeller,
  onRequireAuth,
  onPlaceOrder,
}) {
  const toast = useToast()
  const [reporting, setReporting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [featured, setFeatured] = useState(listing?.featured ?? false)
  const [togglingFeatured, setTogglingFeatured] = useState(false)
  const isOwnListing = listing?.sellerId === currentUserId

  const shareListing = async () => {
    try {
      const result = await shareLink({
        url: getListingShareLink(listing.id),
        title: listing.title,
        text: `${listing.title} — $${listing.price} on Plates`,
      })
      if (result === 'copied') toast.success('Link copied!')
    } catch (err) {
      console.error('Failed to share listing', err)
      toast.error('Could not share that — try again.')
    }
  }

  useEffect(() => {
    if (!listing || isOwnListing) return
    incrementListingViews(listing.id).catch((err) => console.error('Failed to record listing view', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id])

  useEffect(() => {
    if (!listing) return
    addRecentlyViewed(listing.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id])

  if (!listing) return null
  const manuallySold = listing.available === false
  const sold = manuallySold || listing.sellerOnVacation
  const badge = getSellerBadge(sellerRating, sellerTrust)
  const cottageLawVerified = hasCottageLawConfirmed([listing, ...moreFromSeller])
  const isUnclaimed = !!listing.unclaimedStoreId
  const showInlineSellerInfo = isUnclaimed || isOwnListing

  const toggleFeatured = async () => {
    const next = !featured
    setTogglingFeatured(true)
    try {
      await setListingFeatured(listing.id, next, undefined, listing.title)
      setFeatured(next)
      onFeaturedChanged?.(listing.id, next)
      toast.success(next ? 'Listing featured.' : 'Listing unfeatured.')
    } catch (err) {
      console.error('Failed to update featured status', err)
      toast.error('Could not update featured status — try again.')
    } finally {
      setTogglingFeatured(false)
    }
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
          <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>Back to browse</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={shareListing}
            aria-label="Share listing"
            className="pressable text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            Share
          </button>
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? 'Remove from saved' : 'Save listing'}
            className="pressable text-lg"
            style={{ color: isFavorite ? 'var(--plum)' : 'var(--ink-soft)' }}
          >
            {isFavorite ? '♥' : '♡'}
          </button>
        </div>
      </div>

      {listing.photoUrls?.length > 0 && listing.photoUrl ? (
        <div
          className="mx-5 h-40 flex gap-2 overflow-x-auto snap-x snap-mandatory rounded-2xl"
          style={{ scrollbarWidth: 'none' }}
        >
          {[listing.photoUrl, ...listing.photoUrls].map((url, i) => (
            <img
              key={url + i}
              src={url}
              alt={listing.title}
              className="h-40 min-w-full snap-center rounded-2xl object-cover"
            />
          ))}
        </div>
      ) : (
        <div
          className="mx-5 h-40 rounded-2xl flex items-center justify-center text-7xl overflow-hidden"
          style={{ background: listing.bg }}
        >
          {listing.photoUrl ? (
            <img
              src={listing.photoUrl}
              alt={listing.title}
              onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover transition-opacity duration-300"
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
          ) : (
            listing.photo
          )}
        </div>
      )}

      <div className="px-5 mt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 min-w-0">
            {showInlineSellerInfo && listing.sellerAvatar && (
              <img
                src={listing.sellerAvatar}
                alt={listing.seller}
                className="w-9 h-9 rounded-full object-cover mt-0.5 shrink-0"
              />
            )}
            <div className="min-w-0">
              <h2 className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
                {listing.title}
              </h2>
              {showInlineSellerInfo && (
                <>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                    {listing.seller}
                    {!isUnclaimed && sellerRating && ` · ★ ${sellerRating.avgRating} (${sellerRating.reviewCount})`}
                  </p>
                  {listing.sellerKitchen && (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      {listing.sellerKitchen}
                    </p>
                  )}
                  {!isUnclaimed && sellerRating?.avgTaste != null && (
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                      Taste {sellerRating.avgTaste} · Portion {sellerRating.avgPortion} · Value {sellerRating.avgValue}
                    </p>
                  )}
                </>
              )}
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {isUnclaimed && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}
                  >
                    🏪 Not yet on Plates
                  </span>
                )}
                {showInlineSellerInfo && !isUnclaimed && badge && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
                  >
                    {badge.icon} {badge.label}
                  </span>
                )}
                {showInlineSellerInfo && !isUnclaimed && responseStats && responseStats.responseCount >= 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'var(--paper-dim)', color: 'var(--ink-soft)' }}>
                    ⚡ Usually replies within {formatResponseTime(responseStats.avgResponseMinutes)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span
            className="font-display text-2xl shrink-0"
            style={{ color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}
          >
            ${listing.price}
          </span>
        </div>

        {!isUnclaimed && !isOwnListing && (
          <SellerCard
            sellerId={listing.sellerId}
            sellerName={listing.seller}
            sellerAvatar={listing.sellerAvatar}
            sellerNeighborhood={listing.sellerNeighborhood}
            sellerKitchen={listing.sellerKitchen}
            sellerPhoneVerified={listing.sellerPhoneVerified}
            cottageLawVerified={cottageLawVerified}
            badge={badge}
            responseStats={responseStats}
            formatResponseTime={formatResponseTime}
            sellerRating={sellerRating}
            currentUserId={currentUserId}
            onOpenSeller={onOpenSeller}
            onRequireAuth={onRequireAuth}
          />
        )}

        {manuallySold && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
            This listing has been marked sold out{isOwnListing ? '.' : ' by the seller.'}
            {isOwnListing && restockCount > 0 && (
              <span className="block mt-1 font-normal">
                {restockCount} {restockCount === 1 ? 'buyer wants' : 'buyers want'} to know when it's back — mark it available again to notify them.
              </span>
            )}
          </div>
        )}

        {!manuallySold && listing.sellerOnVacation && (
          <div className="mt-3 rounded-xl px-3 py-2 text-xs font-medium" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
            🏖️ {isOwnListing
              ? "You're in vacation mode — buyers can't order from you right now."
              : 'This kitchen is away right now — check back soon.'}
          </div>
        )}

        <p className="text-sm mt-4 leading-relaxed">{listing.description}</p>

        {(listing.cuisine || listing.diet?.length > 0) && (
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {listing.cuisine && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--paper-dim)', color: 'var(--ink)' }}>
                {listing.cuisine}
              </span>
            )}
            {listing.diet?.map((d) => (
              <span key={d} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
                {d}
              </span>
            ))}
          </div>
        )}

        <div className="plate-scallop my-4" />

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="card-elevated p-3">
            <p style={{ color: 'var(--ink-soft)' }}>Made</p>
            <p className="mt-0.5 font-medium">{listing.made}</p>
          </div>
          <div className="card-elevated p-3">
            <p style={{ color: 'var(--ink-soft)' }}>Pickup window</p>
            <p className="mt-0.5 font-medium">{formatPickupTime(listing) ?? listing.pickup}</p>
          </div>
        </div>

        {listing.quantityAvailable != null && !manuallySold && (
          <p className="mt-2 text-xs" style={{ color: listing.quantityAvailable <= 3 ? 'var(--plum)' : 'var(--ink-soft)' }}>
            {listing.quantityAvailable === 0
              ? 'None left'
              : `${listing.quantityAvailable} left`}
          </p>
        )}

        {listing.deliveryAvailable && (
          <div className="mt-3 card-elevated p-3 text-xs">
            <p style={{ color: 'var(--ink-soft)' }}>🚗 Delivery available</p>
            {listing.deliveryNotes && (
              <p className="mt-0.5 font-medium">{listing.deliveryNotes}</p>
            )}
          </div>
        )}

        <div className="mt-3">
          <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Allergens</p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap items-center">
            {listing.allergens.length === 0 && (
              <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}>
                None listed
              </span>
            )}
            {listing.allergens.map((a) => (
              <span key={a} className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
                {a}
              </span>
            ))}
            {listing.allergensConfirmed && (
              <span
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
              >
                ✓ Confirmed by seller
              </span>
            )}
          </div>
        </div>

        {listing.cottageLawConfirmed && (
          <p className="mt-2 text-xs" style={{ color: 'var(--ink-soft)' }}>
            ✓ Seller has confirmed they're legally permitted to sell homemade food where they live
          </p>
        )}

        {moreFromSeller.length > 0 && (
          <div className="mt-5">
            <p className="text-xs mb-2" style={{ color: 'var(--ink-soft)' }}>
              More from {listing.seller}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {moreFromSeller.map((l) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  onSelect={onSelectListing}
                  isFavorite={favoriteIds?.has(l.id)}
                  onToggleFavorite={onToggleFavoriteListing}
                />
              ))}
            </div>
          </div>
        )}

        {currentUserId && !isOwnListing && !sold && <PickupSlotPicker listingId={listing.id} buyerId={currentUserId} />}
        {currentUserId && !isOwnListing && !sold && <OrderAheadPicker listingId={listing.id} buyerId={currentUserId} />}

        {currentUserId && !isOwnListing && !isUnclaimed && (
          <SellerRatingForm
            sellerId={listing.sellerId}
            reviewerId={currentUserId}
            listingId={listing.id}
            onSaved={onRatingSaved}
          />
        )}

        {!isOwnListing && isUnclaimed && (
          <div className="mt-6 card-elevated p-3 text-sm">
            <p className="font-medium" style={{ color: 'var(--forest-dark)' }}>
              🏪 {listing.seller} hasn't joined Plates yet
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
              {listing.unclaimedContactNote
                ? listing.unclaimedContactNote
                : "This listing was posted on their behalf — there's no in-app way to message them yet."}
            </p>
          </div>
        )}

        {!isOwnListing && !isUnclaimed && !sold && currentUserId && onPlaceOrder && (
          <>
            {isOrderingClosed(listing) ? (
              <p
                className="mt-6 text-sm text-center rounded-2xl border p-3.5"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Orders have closed for this pickup window.
              </p>
            ) : (
              <PlaceOrderForm
                price={listing.price}
                maxQuantity={listing.quantityAvailable}
                minOrderAmount={listing.minOrderAmount}
                deliveryAvailable={listing.deliveryAvailable}
                deliveryNotes={listing.deliveryNotes}
                allowRepeat={!listing.pickupDate}
                onSubmit={(quantity, note, fulfillmentMethod, deliveryAddress, repeatInterval) =>
                  onPlaceOrder(quantity, note, fulfillmentMethod, deliveryAddress, repeatInterval)
                }
              />
            )}
            <button
              onClick={onMessageSeller}
              className="pressable w-full mt-2 py-2 text-xs text-center"
              style={{ color: 'var(--ink-soft)' }}
            >
              Just have a question? Message the seller
            </button>
          </>
        )}

        {!isOwnListing && !isUnclaimed && !sold && !currentUserId && (
          <button
            onClick={onMessageSeller}
            className="pressable w-full mt-6 py-3.5 rounded-2xl font-bold text-sm"
            style={{ background: 'var(--forest)', color: 'white' }}
          >
            Message seller to order
          </button>
        )}

        {!isOwnListing && manuallySold && (
          <button
            onClick={onToggleRestockAlert}
            className="pressable w-full mt-6 py-3.5 rounded-2xl font-bold text-sm border-2"
            style={{
              borderColor: 'var(--forest)',
              background: restockRequested ? 'var(--forest)' : 'transparent',
              color: restockRequested ? 'white' : 'var(--forest-dark)',
            }}
          >
            {restockRequested ? "🔔 We'll message you when it's back" : '🔔 Notify me when back in stock'}
          </button>
        )}

        {isOwnListing && (
          <>
            <button
              onClick={onEditListing}
              className="pressable w-full mt-6 py-3.5 rounded-2xl font-bold text-sm hover:opacity-90 active:opacity-80 transition-opacity"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              Edit listing
            </button>
            <p className="text-xs text-center mt-2" style={{ color: 'var(--ink-soft)' }}>
              👁️ {listing.views} view{listing.views === 1 ? '' : 's'}
            </p>
            {!isUnclaimed && (
              <PromotionRequestCard
                listingId={listing.id}
                sellerId={currentUserId}
                featured={featured}
                featuredUntil={listing.featuredUntil}
              />
            )}
          </>
        )}

        {!isOwnListing && (
          <button
            onClick={() => (currentUserId ? setReporting(true) : onRequireAuth?.())}
            className="w-full mt-4 py-2 text-xs text-center"
            style={{ color: 'var(--ink-soft)' }}
          >
            🚩 Report this listing
          </button>
        )}

        {isAdmin && !isOwnListing && (
          <button
            onClick={toggleFeatured}
            disabled={togglingFeatured}
            className="pressable w-full mt-3 py-2.5 rounded-xl text-xs font-medium border disabled:opacity-50"
            style={{
              borderColor: 'var(--plum)',
              background: featured ? 'var(--plum)' : 'transparent',
              color: featured ? 'white' : 'var(--plum)',
            }}
          >
            {featured ? '⭐ Remove from featured' : '⭐ Feature this listing (admin)'}
          </button>
        )}
      </div>

      {reporting && (
        <ReportModal
          reporterId={currentUserId}
          listingId={listing.id}
          reportedUserId={listing.sellerId}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  )
}
