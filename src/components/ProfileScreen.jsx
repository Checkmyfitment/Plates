import ListingCard from './ListingCard'
import Placeholder from './Placeholder'
import CuisineAlerts from './CuisineAlerts'
import InviteFriends from './InviteFriends'
import PushToggle from './PushToggle'
import AreaAlertsToggle from './AreaAlertsToggle'
import PhoneVerification from './PhoneVerification'
import FollowedKitchens from './FollowedKitchens'
import MySubscriptions from './MySubscriptions'
import ThemeToggle from './ThemeToggle'
import GettingStartedChecklist from './GettingStartedChecklist'
import AccountSecurity from './AccountSecurity'
import { getSellerBadge } from '../lib/badges'
import { formatSocialLinkLabel } from '../lib/socialLink'

export default function ProfileScreen({
  user,
  userId,
  email,
  listings,
  favoriteIds,
  sellerRating,
  sellerTrust,
  onSelect,
  onLogout,
  onEditProfile,
  isAdmin,
  onOpenAdmin,
  onOpenLegal,
  onOpenStorefront,
  onOpenSeller,
  onOpenOrders,
  onOpenDashboard,
  onGoToSell,
  onGoBrowse,
  hasEverOrdered,
  signupIntent,
  onProfileRefresh,
}) {
  // null covers every account that signed up before this choice existed —
  // treated the same as 'both' so nobody loses a checklist they already had
  const showBuyerChecklist = signupIntent !== 'seller'
  const showSellerChecklist = signupIntent !== 'buyer'
  const yourListings = listings.filter((l) => l.sellerId === userId && !l.unclaimedStoreId)
  const badge = yourListings.length > 0 ? getSellerBadge(sellerRating, sellerTrust) : null

  return (
    <div className="px-5 pb-4">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-medium overflow-hidden shrink-0"
          style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl truncate" style={{ color: 'var(--forest-dark)' }}>
            {user.name}
          </h2>
          <p className="text-xs truncate" style={{ color: 'var(--ink-soft)' }}>
            {email}
          </p>
          {user.kitchen && (
            <p className="text-xs truncate font-medium" style={{ color: 'var(--forest-dark)' }}>
              {user.kitchen}
            </p>
          )}
          {user.isPro && (
            <span
              className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 mr-1"
              style={{ background: 'var(--mustard)', color: 'var(--forest-dark)' }}
            >
              🌟 Plates Pro
            </span>
          )}
          {badge && (
            <span
              className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1"
              style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
            >
              {badge.icon} {badge.label}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="pressable text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: 'var(--plum)', color: 'var(--plum)' }}
            >
              🛡️ Admin
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="pressable text-xs px-3 py-1.5 rounded-full border"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Log out
            </button>
          )}
        </div>
      </div>

      {user.bio && (
        <p className="text-sm mb-1.5 leading-relaxed" style={{ color: 'var(--ink)' }}>
          {user.bio}
        </p>
      )}
      {user.socialLink && (
        <a
          href={user.socialLink}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-block text-xs mb-3"
          style={{ color: 'var(--forest-dark)', textDecoration: 'underline' }}
        >
          🔗 {formatSocialLinkLabel(user.socialLink)}
        </a>
      )}

      <div className="flex gap-2 mb-5">
        {onEditProfile && (
          <button
            onClick={onEditProfile}
            className="pressable text-xs px-3 py-1.5 rounded-full border"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            Edit profile
          </button>
        )}
        {onOpenStorefront && (
          <button
            onClick={onOpenStorefront}
            className="pressable text-xs px-3 py-1.5 rounded-full border"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            View public profile
          </button>
        )}
        {onOpenOrders && (
          <button
            onClick={onOpenOrders}
            className="pressable text-xs px-3 py-1.5 rounded-full border"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            📦 My Orders
          </button>
        )}
        {onOpenDashboard && yourListings.length > 0 && (
          <button
            onClick={onOpenDashboard}
            className="pressable text-xs px-3 py-1.5 rounded-full border"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            📊 Seller Dashboard
          </button>
        )}
      </div>

      {onEditProfile && onGoBrowse && showBuyerChecklist && (
        <GettingStartedChecklist
          title="🛒 Getting started as a buyer"
          steps={[
            { key: 'neighborhood', label: 'Set your neighborhood', done: !!user.neighborhood, action: onEditProfile },
            { key: 'favorite', label: 'Save a listing you like', done: favoriteIds.size > 0, action: onGoBrowse },
            { key: 'order', label: 'Place your first order', done: !!hasEverOrdered, action: onGoBrowse },
          ]}
        />
      )}

      {onEditProfile && onGoToSell && showSellerChecklist && (
        <GettingStartedChecklist
          title="🚀 Getting started as a seller"
          steps={[
            { key: 'photo', label: 'Add a profile photo', done: !!user.avatarUrl, action: onEditProfile },
            { key: 'neighborhood', label: 'Set your neighborhood', done: !!user.neighborhood, action: onEditProfile },
            { key: 'listing', label: 'Post your first listing', done: yourListings.length > 0, action: onGoToSell },
          ]}
        />
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="icon-badge mx-auto mb-2" aria-hidden="true" style={{ background: 'var(--forest-soft)' }}>
            🍽️
          </div>
          <p className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {yourListings.length}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Listings posted
          </p>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="icon-badge mx-auto mb-2" aria-hidden="true" style={{ background: 'var(--forest-soft)' }}>
            ♡
          </div>
          <p className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {favoriteIds.size}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Saved
          </p>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="icon-badge mx-auto mb-2" aria-hidden="true" style={{ background: 'var(--mustard-soft)' }}>
            ★
          </div>
          <p className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {sellerRating ? sellerRating.avgRating : '—'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            {sellerRating ? `${sellerRating.reviewCount} rating${sellerRating.reviewCount === 1 ? '' : 's'}` : 'Your rating'}
          </p>
        </div>
      </div>

      {yourListings.length > 0 && (
        <p className="text-xs -mt-3 mb-5" style={{ color: 'var(--ink-soft)' }}>
          👁️ {yourListings.reduce((sum, l) => sum + (l.views || 0), 0)} total views across your listings
        </p>
      )}

      <ThemeToggle />

      {userId && <AccountSecurity email={email} />}

      {userId && <InviteFriends userId={userId} />}

      {userId && <PhoneVerification phoneVerified={!!user.phoneVerified} onVerified={onProfileRefresh} />}

      {userId && <PushToggle userId={userId} />}

      {userId && <AreaAlertsToggle userId={userId} />}

      {userId && <CuisineAlerts userId={userId} />}

      {userId && onOpenSeller && <FollowedKitchens userId={userId} onOpenSeller={onOpenSeller} />}
      {userId && onSelect && (
        <MySubscriptions userId={userId} onOpenListing={(id) => onSelect(listings.find((l) => l.id === id))} />
      )}

      <h3 className="text-xs font-medium mb-2 mt-5" style={{ color: 'var(--ink-soft)' }}>
        Your listings
      </h3>
      {yourListings.length === 0 ? (
        <Placeholder compact icon="🍽️" title="Nothing posted yet" body="Head to the Sell tab to list something." />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {yourListings.map((l) => (
            <ListingCard key={l.id} listing={l} onSelect={onSelect} />
          ))}
        </div>
      )}

      {onOpenLegal && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-6 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
          <button onClick={() => onOpenLegal('terms')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Terms of Service
          </button>
          <button onClick={() => onOpenLegal('privacy')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Privacy Policy
          </button>
          <button onClick={() => onOpenLegal('guidelines')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Community Guidelines
          </button>
          <button onClick={() => onOpenLegal('states')} className="text-xs" style={{ color: 'var(--ink-soft)' }}>
            Cottage Food Laws by State
          </button>
        </div>
      )}
    </div>
  )
}
