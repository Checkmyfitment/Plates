import { useEffect, useState, lazy, Suspense } from 'react'
import Logo from './components/Logo'
import TopBar from './components/TopBar'
import BottomNav from './components/BottomNav'
import BrowseScreen from './components/BrowseScreen'
import ListingDetail from './components/ListingDetail'
import SavedScreen from './components/SavedScreen'
import ChatsScreen from './components/ChatsScreen'
import ChatThread from './components/ChatThread'
import ProfileScreen from './components/ProfileScreen'
import AuthScreen from './components/AuthScreen'
import BannedScreen from './components/BannedScreen'
import DeletedScreen from './components/DeletedScreen'
import OnboardingWalkthrough from './components/OnboardingWalkthrough'
import { hasSeenOnboarding, markOnboardingSeen } from './lib/onboarding'
import { useAuth } from './context/AuthContext'
import { fetchListings, insertListing, updateListing, deleteListing, setListingAvailability } from './lib/listings'
import { fetchFavoriteIds, addFavorite, removeFavorite } from './lib/favorites'
import { fetchChats, startOrGetChat, sendMessage as sendChatMessage, markChatRead } from './lib/chats'
import { subscribeToTable } from './lib/realtime'
import { placeOrder, placeCartOrder, fetchHasEverOrdered } from './lib/orders'
import { createSubscription } from './lib/subscriptions'
import { fetchSellerRatings, fetchSellerTrustStats } from './lib/reviews'
import { fetchRestockIds, addRestockAlert, removeRestockAlert, fetchRestockCounts } from './lib/restock'
import { fetchResponseStats } from './lib/responseStats'
import { fetchNotifications, markNotificationRead, markAllNotificationsRead } from './lib/notifications'
import { trackPageView } from './lib/analytics'
import { claimStore, getPendingClaim, clearPendingClaim } from './lib/stores'
import { useToast } from './context/ToastContext'

// only admins ever open this screen, so it stays out of everyone else's
// initial bundle
const AdminScreen = lazy(() => import('./components/AdminScreen'))

// none of these are needed for the first thing almost anyone does (browse,
// or log in) -- splitting them out keeps the initial bundle to what a
// brand-new guest actually needs
const PostListing = lazy(() => import('./components/PostListing'))
const ResetPassword = lazy(() => import('./components/ResetPassword'))
const EditListing = lazy(() => import('./components/EditListing'))
const EditProfile = lazy(() => import('./components/EditProfile'))
const NotificationsScreen = lazy(() => import('./components/NotificationsScreen'))
const LegalScreen = lazy(() => import('./components/LegalScreen'))
const SellerStorefront = lazy(() => import('./components/SellerStorefront'))
const OrdersScreen = lazy(() => import('./components/OrdersScreen'))
const SellerDashboard = lazy(() => import('./components/SellerDashboard'))

const screenFallback = (
  <div className="px-5 pt-6">
    <div className="skeleton h-40 w-full rounded-2xl" />
  </div>
)

const titles = {
  browse: 'Plates',
  favorites: 'Saved',
  post: 'Sell',
  messages: 'Chats',
  profile: 'You',
}

export default function App() {
  const { session, profile, loading, signOut, refreshProfile, passwordRecovery } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('browse')
  const [selected, setSelected] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [legalDoc, setLegalDoc] = useState(null)
  const [viewingSellerId, setViewingSellerId] = useState(null)
  const [showOrders, setShowOrders] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [listings, setListings] = useState([])
  const [listingsLoading, setListingsLoading] = useState(true)
  const [favoriteIds, setFavoriteIds] = useState(new Set())
  const [hasEverOrdered, setHasEverOrdered] = useState(false)
  const [chats, setChats] = useState([])
  const [chatsLoading, setChatsLoading] = useState(true)
  const [activeChatId, setActiveChatId] = useState(null)
  const [sellerRatings, setSellerRatings] = useState(new Map())
  const [sellerTrustStats, setSellerTrustStats] = useState(new Map())
  const [restockIds, setRestockIds] = useState(new Set())
  const [restockCounts, setRestockCounts] = useState(new Map())
  const [responseStats, setResponseStats] = useState(new Map())
  const [notifications, setNotifications] = useState([])
  const [claimAttempted, setClaimAttempted] = useState(false)
  const [sellerLinkOpened, setSellerLinkOpened] = useState(false)
  const [listingLinkOpened, setListingLinkOpened] = useState(false)
  const [onboarded, setOnboarded] = useState(() => hasSeenOnboarding())
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [authPromptReason, setAuthPromptReason] = useState(null)

  useEffect(() => {
    setListingsLoading(true)
    fetchListings()
      .then(setListings)
      .catch((err) => {
        console.error('Failed to load listings', err)
        toast.error('Could not load listings — check your connection and try again.')
      })
      .finally(() => setListingsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // browsing works without an account; anything that needs one is gated by
  // requireAuth() below. Once someone logs in, close the prompt; once they
  // log out, fall back to a clean guest view of Browse instead of leaving
  // them stranded on a screen (Profile, Chats, ...) that assumes a session
  useEffect(() => {
    if (session) {
      setAuthPromptOpen(false)
      return
    }
    setTab('browse')
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setLegalDoc(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
  }, [session])

  useEffect(() => {
    if (!session) {
      setFavoriteIds(new Set())
      return
    }
    fetchFavoriteIds(session.user.id)
      .then(setFavoriteIds)
      .catch((err) => console.error('Failed to load favorites', err))
  }, [session])

  // just for the buyer getting-started checklist — not worth keeping a
  // full order list in memory for a single true/false nudge
  useEffect(() => {
    if (!session) {
      setHasEverOrdered(false)
      return
    }
    fetchHasEverOrdered(session.user.id)
      .then(setHasEverOrdered)
      .catch((err) => console.error('Failed to check order history', err))
  }, [session])

  useEffect(() => {
    if (!session) {
      setChats([])
      return
    }
    setChatsLoading(true)
    fetchChats(session.user.id)
      .then(setChats)
      .catch((err) => {
        console.error('Failed to load chats', err)
        toast.error('Could not load chats — check your connection and try again.')
      })
      .finally(() => setChatsLoading(false))

    // live-refresh the whole list on any new message in one of my chats —
    // row-level security already scopes which messages this delivers, and
    // re-fetching (rather than hand-merging into the nested chats/messages
    // shape) reuses the same tested mapping fetchChats already does
    const unsubscribe = subscribeToTable('messages', {
      event: 'INSERT',
      onChange: () => {
        fetchChats(session.user.id)
          .then(setChats)
          .catch((err) => console.error('Failed to live-refresh chats', err))
      },
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (!activeChatId) return
    const chat = chats.find((c) => c.id === activeChatId)
    if (!chat || chat.unreadCount === 0) return
    markChatRead(chat.id, chat.isSeller)
      .then(() => {
        setChats((prev) => prev.map((c) => (c.id === chat.id ? { ...c, unreadCount: 0 } : c)))
      })
      .catch((err) => console.error('Failed to mark chat read', err))
  }, [activeChatId, chats])

  const refreshSellerRatings = () => {
    fetchSellerRatings()
      .then(setSellerRatings)
      .catch((err) => console.error('Failed to load seller ratings', err))
  }

  useEffect(() => {
    if (!session) {
      setSellerRatings(new Map())
      return
    }
    refreshSellerRatings()
  }, [session])

  useEffect(() => {
    if (!session) {
      setSellerTrustStats(new Map())
      return
    }
    fetchSellerTrustStats()
      .then(setSellerTrustStats)
      .catch((err) => console.error('Failed to load seller trust stats', err))
  }, [session])

  const refreshRestockCounts = () => {
    fetchRestockCounts()
      .then(setRestockCounts)
      .catch((err) => console.error('Failed to load restock counts', err))
  }

  useEffect(() => {
    if (!session) {
      setRestockIds(new Set())
      setRestockCounts(new Map())
      return
    }
    fetchRestockIds(session.user.id)
      .then(setRestockIds)
      .catch((err) => console.error('Failed to load restock alerts', err))
    refreshRestockCounts()
  }, [session])

  useEffect(() => {
    if (!session) {
      setResponseStats(new Map())
      return
    }
    fetchResponseStats()
      .then(setResponseStats)
      .catch((err) => console.error('Failed to load response stats', err))
  }, [session])

  useEffect(() => {
    if (!session) {
      setNotifications([])
      return
    }
    fetchNotifications(session.user.id)
      .then(setNotifications)
      .catch((err) => console.error('Failed to load notifications', err))

    const unsubscribe = subscribeToTable('notifications', {
      event: 'INSERT',
      filter: `user_id=eq.${session.user.id}`,
      onChange: () => {
        fetchNotifications(session.user.id)
          .then(setNotifications)
          .catch((err) => console.error('Failed to live-refresh notifications', err))
      },
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    if (!session || claimAttempted) return
    const params = new URLSearchParams(window.location.search)
    // the ?claim= param survives a normal signup, but if email confirmation
    // is on the user leaves for their inbox and comes back on a bare URL —
    // fall back to the code stashed in localStorage by AuthScreen for that case
    const claimCode = params.get('claim') || getPendingClaim()
    if (!claimCode) return
    setClaimAttempted(true)

    const cleanUrl = () => {
      params.delete('claim')
      const search = params.toString()
      window.history.replaceState({}, '', window.location.pathname + (search ? `?${search}` : ''))
      clearPendingClaim()
    }

    claimStore(claimCode)
      .then((store) => {
        toast.success(`🎉 You've claimed ${store?.name ?? 'your store'}! Your listings are now yours to manage.`)
        cleanUrl()
        refreshProfile()
        fetchListings().then(setListings).catch((err) => console.error('Failed to reload listings', err))
      })
      .catch((err) => {
        console.error('Failed to claim store', err)
        toast.error(err.message || 'Could not claim that store — the link may be invalid or already used.')
        cleanUrl()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, claimAttempted])

  useEffect(() => {
    if (sellerLinkOpened) return
    const params = new URLSearchParams(window.location.search)
    const sellerId = params.get('seller')
    if (!sellerId) return
    setSellerLinkOpened(true)
    openSeller(sellerId)
    params.delete('seller')
    const search = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (search ? `?${search}` : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerLinkOpened])

  useEffect(() => {
    if (listingLinkOpened || listingsLoading) return
    const params = new URLSearchParams(window.location.search)
    const listingId = params.get('listing')
    if (!listingId) return
    setListingLinkOpened(true)
    const listing = listings.find((l) => l.id === listingId)
    if (listing) setSelected(listing)
    params.delete('listing')
    const search = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (search ? `?${search}` : ''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingLinkOpened, listingsLoading])

  const requireAuth = (reason) => {
    setAuthPromptReason(reason || null)
    setAuthPromptOpen(true)
    trackPageView('auth')
  }

  // one page-view event per tab switch — cheap top-of-funnel signal for
  // how much the app actually gets used, which nothing else here tracks
  useEffect(() => {
    trackPageView(tab, session?.user?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const tabAuthReasons = {
    favorites: "Log in to see what you've saved.",
    post: 'Log in to start selling.',
    messages: 'Log in to message sellers.',
    profile: 'Log in to view your profile.',
  }

  const changeTab = (t) => {
    if (!session && t !== 'browse') {
      requireAuth(tabAuthReasons[t])
      return
    }
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setLegalDoc(null)
    setViewingSellerId(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
    setTab(t)
  }

  const openAdmin = () => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setLegalDoc(null)
    setViewingSellerId(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
    setShowAdmin(true)
  }

  const openLegal = (doc) => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setViewingSellerId(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
    setLegalDoc(doc)
  }

  const openSeller = (sellerId) => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setLegalDoc(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
    setViewingSellerId(sellerId)
  }

  const openOrders = () => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setLegalDoc(null)
    setViewingSellerId(null)
    setActiveChatId(null)
    setShowDashboard(false)
    setShowOrders(true)
  }

  const openDashboard = () => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setShowNotifications(false)
    setShowAdmin(false)
    setLegalDoc(null)
    setViewingSellerId(null)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(true)
  }

  const openNotifications = () => {
    setSelected(null)
    setEditingListing(null)
    setEditingProfile(false)
    setActiveChatId(null)
    setShowOrders(false)
    setShowDashboard(false)
    setShowNotifications(true)
    const hadUnread = notifications.some((n) => !n.read)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (hadUnread) {
      markAllNotificationsRead(session.user.id).catch((err) => console.error('Failed to mark notifications read', err))
    }
  }

  const openNotification = (notification) => {
    if (!notification.read) {
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)))
      markNotificationRead(notification.id).catch((err) => console.error('Failed to mark notification read', err))
    }
    const listing = listings.find((l) => l.id === notification.listingId)
    setShowNotifications(false)
    if (listing) {
      setSelected(listing)
    } else {
      setTab('browse')
    }
  }

  const toggleFavorite = (id) => {
    const isFavorite = favoriteIds.has(id)
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (isFavorite) next.delete(id)
      else next.add(id)
      return next
    })
    const mutate = isFavorite ? removeFavorite(session.user.id, id) : addFavorite(session.user.id, id)
    mutate.catch((err) => {
      console.error('Failed to update favorite', err)
      toast.error('Could not update saved listings — try again.')
      setFavoriteIds((prev) => {
        const reverted = new Set(prev)
        if (isFavorite) reverted.add(id)
        else reverted.delete(id)
        return reverted
      })
    })
  }

  const toggleRestockAlert = (id) => {
    const isRequested = restockIds.has(id)
    setRestockIds((prev) => {
      const next = new Set(prev)
      if (isRequested) next.delete(id)
      else next.add(id)
      return next
    })
    const mutate = isRequested ? removeRestockAlert(session.user.id, id) : addRestockAlert(session.user.id, id)
    mutate.catch((err) => {
      console.error('Failed to update restock alert', err)
      toast.error('Could not update restock alert — try again.')
      setRestockIds((prev) => {
        const reverted = new Set(prev)
        if (isRequested) reverted.add(id)
        else reverted.delete(id)
        return reverted
      })
    })
  }

  const addListing = async (formData) => {
    try {
      const listing = await insertListing({ sellerId: session.user.id, ...formData })
      setListings((prev) => [listing, ...prev])
      toast.success('Listing posted!')
      return listing
    } catch (err) {
      console.error('Failed to post listing', err)
      throw err
    }
  }

  const saveListingEdits = async (id, formData) => {
    try {
      const updated = await updateListing(id, formData)
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)))
      setSelected(updated)
      setEditingListing(null)
      toast.success('Listing updated.')
    } catch (err) {
      console.error('Failed to save listing edits', err)
      throw err
    }
  }

  const duplicateListing = async (listing) => {
    try {
      // fresh pickup date and stock count on purpose — those are usually
      // stale by the time someone reposts a recurring item ("dumplings
      // every Saturday"), everything else carries over as-is
      const created = await insertListing({
        sellerId: session.user.id,
        title: listing.title,
        price: listing.price,
        unit: listing.unit,
        description: listing.description,
        allergens: listing.allergens,
        pickup: listing.pickup,
        pickupDate: '',
        pickupStart: listing.pickupStart ?? '',
        pickupEnd: listing.pickupEnd ?? '',
        quantityAvailable: null,
        orderCutoffHours: listing.orderCutoffHours,
        photoUrl: listing.photoUrl,
        photoUrls: listing.photoUrls,
        deliveryAvailable: listing.deliveryAvailable,
        deliveryNotes: listing.deliveryNotes,
        cuisine: listing.cuisine,
        diet: listing.diet,
        unclaimedStoreId: listing.unclaimedStoreId,
      })
      setListings((prev) => [created, ...prev])
      setEditingListing(null)
      setSelected(created)
      toast.success('Listing reposted!')
    } catch (err) {
      console.error('Failed to repost listing', err)
      toast.error('Could not repost this listing — try again.')
    }
  }

  const toggleListingAvailability = async (id, available) => {
    try {
      const updated = await setListingAvailability(id, available)
      setListings((prev) => prev.map((l) => (l.id === id ? updated : l)))
      setSelected((prev) => (prev && prev.id === id ? updated : prev))
      setEditingListing((prev) => (prev && prev.id === id ? updated : prev))
      toast.success(available ? 'Marked as available.' : 'Marked as sold out.')
      if (available) {
        // buyers who asked to be notified just got auto-messaged — refresh so
        // the seller's own chat list and the waiting-count both catch up
        fetchChats(session.user.id).then(setChats).catch((err) => console.error('Failed to reload chats', err))
        refreshRestockCounts()
      }
    } catch (err) {
      console.error('Failed to update listing availability', err)
      throw err
    }
  }

  const removeListing = async (id) => {
    try {
      await deleteListing(id)
      setListings((prev) => prev.filter((l) => l.id !== id))
      setEditingListing(null)
      setSelected(null)
      toast.success('Listing deleted.')
    } catch (err) {
      console.error('Failed to delete listing', err)
      throw err
    }
  }

  const startChat = async (listing) => {
    if (listing.sellerId === session.user.id) return
    try {
      const chatId = await startOrGetChat(listing, session.user.id)
      const updated = await fetchChats(session.user.id)
      setChats(updated)
      setActiveChatId(chatId)
      setSelected(null)
      setTab('messages')
    } catch (err) {
      console.error('Failed to start chat', err)
      toast.error('Could not start a chat with this seller — try again.')
    }
  }

  const sendMessage = async (chatId, text, photoUrl) => {
    try {
      const message = await sendChatMessage(chatId, session.user.id, text, photoUrl)
      setChats((prev) =>
        prev.map((c) => (c.id === chatId ? { ...c, messages: [...c.messages, message] } : c)),
      )
    } catch (err) {
      console.error('Failed to send message', err)
      toast.error('Message failed to send — try again.')
    }
  }

  const placeOrderAndNotify = async (listing, quantity, note, fulfillmentMethod, deliveryAddress, repeatInterval) => {
    try {
      await placeOrder({
        listingId: listing.id,
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        quantity,
        note,
        priceAtOrder: listing.price,
        fulfillmentMethod,
        deliveryAddress,
      })
      if (repeatInterval) {
        try {
          await createSubscription({
            listingId: listing.id,
            buyerId: session.user.id,
            sellerId: listing.sellerId,
            quantity,
            intervalDays: repeatInterval,
            fulfillmentMethod,
            deliveryAddress,
          })
        } catch (err) {
          console.error('Failed to create subscription', err)
        }
      }
      const chatId = await startOrGetChat(listing, session.user.id)
      const fulfillmentNote =
        fulfillmentMethod === 'delivery' ? ` · 🚗 Delivery to: ${deliveryAddress}` : ''
      const summary = `🛒 New order: ${quantity}x ${listing.title} ($${listing.price} each)${fulfillmentNote}${note ? ` — "${note}"` : ''}`
      await sendChatMessage(chatId, session.user.id, summary)
      const updated = await fetchChats(session.user.id)
      setChats(updated)
      setActiveChatId(chatId)
      setSelected(null)
      setTab('messages')
      toast.success(
        repeatInterval
          ? `Order placed! It'll repeat every ${repeatInterval === 7 ? 'week' : '2 weeks'} until you cancel it from your profile.`
          : 'Order placed! Message the seller to confirm pickup.',
      )
    } catch (err) {
      console.error('Failed to place order', err)
      toast.error(err?.message?.includes('left') ? err.message : 'Could not place your order — try again.')
    }
  }

  const placeCartOrderAndNotify = async (sellerId, items, fulfillmentMethod, deliveryAddress) => {
    try {
      await placeCartOrder({ items, buyerId: session.user.id, sellerId, fulfillmentMethod, deliveryAddress })
      const anchor = listings.find((l) => l.id === items[0].listingId)
      const chatId = await startOrGetChat(anchor, session.user.id)
      const fulfillmentNote = fulfillmentMethod === 'delivery' ? ` · 🚗 Delivery to: ${deliveryAddress}` : ''
      const summary =
        (items.length === 1
          ? `🛒 New order: ${items[0].quantity}x ${anchor.title} ($${items[0].priceAtOrder} each)`
          : '🛒 New order:\n' +
            items
              .map((item) => {
                const l = listings.find((x) => x.id === item.listingId)
                return `• ${item.quantity}x ${l?.title ?? 'item'} ($${item.priceAtOrder} each)`
              })
              .join('\n')) + fulfillmentNote
      await sendChatMessage(chatId, session.user.id, summary)
      const updated = await fetchChats(session.user.id)
      setChats(updated)
      setActiveChatId(chatId)
      setViewingSellerId(null)
      setShowOrders(false)
      setShowDashboard(false)
      setTab('messages')
      toast.success('Order placed! Message the seller to confirm pickup.')
      return true
    } catch (err) {
      console.error('Failed to place cart order', err)
      toast.error(err?.message?.includes('left') ? err.message : 'Could not place your order — try again.')
      return false
    }
  }

  const reorderGroup = async (group) => {
    const items = group.orders.map((o) => {
      const listing = listings.find((l) => l.id === o.listingId)
      return listing ? { listingId: listing.id, quantity: o.quantity, priceAtOrder: listing.price, listing } : null
    })
    if (items.some((i) => !i)) {
      toast.error("One of these listings isn't available anymore.")
      return
    }
    if (items.some((i) => i.listing.available === false || i.listing.sellerOnVacation)) {
      toast.error('This seller has sold out or is away right now.')
      return
    }
    // only reuse the original delivery choice if every item in this reorder
    // still has delivery enabled — otherwise fall back to pickup rather than
    // silently submitting a delivery order the seller no longer offers
    const wantsDelivery = group.orders[0].fulfillmentMethod === 'delivery' && items.every((i) => i.listing.deliveryAvailable)
    await placeCartOrderAndNotify(
      group.orders[0].sellerId,
      items.map(({ listingId, quantity, priceAtOrder }) => ({ listingId, quantity, priceAtOrder })),
      wantsDelivery ? 'delivery' : 'pickup',
      wantsDelivery ? group.orders[0].deliveryAddress : undefined,
    )
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--paper)' }}>
        <div className="animate-pulse">
          <Logo size={44} />
        </div>
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Setting the table…</p>
      </div>
    )
  }

  if (passwordRecovery) {
    return (
      <Suspense fallback={screenFallback}>
        <ResetPassword />
      </Suspense>
    )
  }

  if (authPromptOpen && !session) {
    return <AuthScreen onClose={() => setAuthPromptOpen(false)} reason={authPromptReason} />
  }

  if (profile?.banned) {
    return <BannedScreen onLogout={signOut} />
  }

  if (profile?.deleted_at) {
    return <DeletedScreen onLogout={signOut} />
  }

  if (!onboarded) {
    return (
      <OnboardingWalkthrough
        onDone={() => {
          markOnboardingSeen()
          setOnboarded(true)
        }}
      />
    )
  }

  let body
  const activeChat = chats.find((c) => c.id === activeChatId)
  if (session && showAdmin) {
    body = (
      <Suspense fallback={<div className="px-5 pt-6"><div className="skeleton h-40 w-full rounded-2xl" /></div>}>
        <AdminScreen
          onBack={() => setShowAdmin(false)}
          adminId={session.user.id}
          onSelfProfileChanged={refreshProfile}
          onEditListing={(listing) => {
            setShowAdmin(false)
            setEditingListing(listing)
          }}
        />
      </Suspense>
    )
  } else if (session && editingListing) {
    body = (
      <Suspense fallback={screenFallback}>
        <EditListing
          listing={editingListing}
          onBack={() => setEditingListing(null)}
          onSave={saveListingEdits}
          onDelete={removeListing}
          onToggleAvailability={toggleListingAvailability}
          onDuplicate={duplicateListing}
          currentUserId={session.user.id}
        />
      </Suspense>
    )
  } else if (session && showOrders) {
    body = (
      <Suspense fallback={screenFallback}>
        <OrdersScreen
          userId={session.user.id}
          onBack={() => setShowOrders(false)}
          onReorder={reorderGroup}
          onOpenDashboard={() => {
            setShowOrders(false)
            setShowDashboard(true)
          }}
        />
      </Suspense>
    )
  } else if (session && showDashboard) {
    body = (
      <Suspense fallback={screenFallback}>
        <SellerDashboard
          userId={session.user.id}
          listings={listings}
          sellerRating={sellerRatings.get(session.user.id)}
          profile={profile}
          onProfileRefresh={refreshProfile}
          onBack={() => setShowDashboard(false)}
          onEditListing={setEditingListing}
          onDuplicate={duplicateListing}
        />
      </Suspense>
    )
  } else if (session && legalDoc) {
    body = (
      <Suspense fallback={screenFallback}>
        <LegalScreen doc={legalDoc} onBack={() => setLegalDoc(null)} />
      </Suspense>
    )
  } else if (session && showNotifications) {
    body = (
      <Suspense fallback={screenFallback}>
        <NotificationsScreen
          notifications={notifications}
          onBack={() => setShowNotifications(false)}
          onOpen={openNotification}
        />
      </Suspense>
    )
  } else if (session && editingProfile) {
    body = (
      <Suspense fallback={screenFallback}>
        <EditProfile
          userId={session.user.id}
          profile={profile}
          onBack={() => setEditingProfile(false)}
          onSaved={async () => {
            await refreshProfile()
            fetchListings().then(setListings).catch((err) => console.error('Failed to reload listings', err))
            setEditingProfile(false)
          }}
        />
      </Suspense>
    )
  } else if (selected) {
    body = (
      <ListingDetail
        listing={selected}
        onBack={() => setSelected(null)}
        isFavorite={favoriteIds.has(selected.id)}
        onToggleFavorite={() => (session ? toggleFavorite(selected.id) : requireAuth('Log in to save this listing.'))}
        onMessageSeller={() => (session ? startChat(selected) : requireAuth('Log in to message the seller.'))}
        sellerRating={sellerRatings.get(selected.sellerId)}
        sellerTrust={sellerTrustStats.get(selected.sellerId)}
        currentUserId={session?.user?.id ?? null}
        onRatingSaved={refreshSellerRatings}
        moreFromSeller={listings.filter((l) =>
          selected.unclaimedStoreId
            ? l.unclaimedStoreId === selected.unclaimedStoreId && l.id !== selected.id
            : l.sellerId === selected.sellerId && !l.unclaimedStoreId && l.id !== selected.id,
        )}
        onSelectListing={setSelected}
        favoriteIds={favoriteIds}
        onToggleFavoriteListing={session ? toggleFavorite : () => requireAuth('Log in to save this listing.')}
        onEditListing={() => setEditingListing(selected)}
        restockRequested={restockIds.has(selected.id)}
        onToggleRestockAlert={() => (session ? toggleRestockAlert(selected.id) : requireAuth('Log in to get notified when this is back.'))}
        restockCount={restockCounts.get(selected.id) ?? 0}
        responseStats={responseStats.get(selected.sellerId)}
        isAdmin={!!profile?.is_admin}
        onFeaturedChanged={(id, featured) =>
          setListings((prev) => prev.map((l) => (l.id === id ? { ...l, featured } : l)))
        }
        onOpenSeller={() => openSeller(selected.sellerId)}
        onRequireAuth={requireAuth}
        onPlaceOrder={(quantity, note, fulfillmentMethod, deliveryAddress, repeatInterval) =>
          placeOrderAndNotify(selected, quantity, note, fulfillmentMethod, deliveryAddress, repeatInterval)
        }
      />
    )
  } else if (viewingSellerId) {
    body = (
      <Suspense fallback={screenFallback}>
        <SellerStorefront
          sellerId={viewingSellerId}
          currentUserId={session?.user?.id ?? null}
          listings={listings}
          favoriteIds={favoriteIds}
          onToggleFavoriteListing={session ? toggleFavorite : () => requireAuth('Log in to save this listing.')}
          sellerRating={sellerRatings.get(viewingSellerId)}
          sellerTrust={sellerTrustStats.get(viewingSellerId)}
          onBack={() => setViewingSellerId(null)}
          onSelectListing={setSelected}
          onRequireAuth={requireAuth}
          onPlaceCartOrder={(items, fulfillmentMethod, deliveryAddress) =>
            placeCartOrderAndNotify(viewingSellerId, items, fulfillmentMethod, deliveryAddress)
          }
        />
      </Suspense>
    )
  } else if (session && tab === 'messages' && activeChat) {
    body = (
      <ChatThread
        chat={activeChat}
        currentUserId={session.user.id}
        viewerProfile={profile}
        onBack={() => setActiveChatId(null)}
        onSend={(text, photoUrl) => sendMessage(activeChat.id, text, photoUrl)}
      />
    )
  } else if (session && tab === 'post') {
    body = (
      <Suspense fallback={screenFallback}>
        <PostListing
          onAddListing={addListing}
          onEditListing={setEditingListing}
          isAdmin={!!profile?.is_admin}
          currentUserId={session.user.id}
          defaultPickupNote={profile?.default_pickup_note}
        />
      </Suspense>
    )
  } else if (session && tab === 'favorites') {
    body = (
      <SavedScreen
        listings={listings.filter((l) => favoriteIds.has(l.id))}
        loading={listingsLoading}
        onSelect={setSelected}
        favoriteIds={favoriteIds}
        onToggleFavorite={toggleFavorite}
      />
    )
  } else if (session && tab === 'messages') {
    body = <ChatsScreen chats={chats} loading={chatsLoading} onSelect={(id) => setActiveChatId(id)} />
  } else if (session && tab === 'profile') {
    body = (
      <ProfileScreen
        user={{
          name: profile?.name ?? session.user.email,
          kitchen: profile?.kitchen ?? null,
          bio: profile?.bio ?? null,
          socialLink: profile?.social_link ?? null,
          avatarUrl: profile?.avatar_url ?? null,
          neighborhood: profile?.neighborhood ?? null,
          phoneVerified: profile?.phone_verified ?? false,
        }}
        signupIntent={profile?.signup_intent ?? null}
        userId={session.user.id}
        email={session.user.email}
        listings={listings}
        favoriteIds={favoriteIds}
        sellerRating={sellerRatings.get(session.user.id)}
        sellerTrust={sellerTrustStats.get(session.user.id)}
        onSelect={setSelected}
        onLogout={signOut}
        onEditProfile={() => setEditingProfile(true)}
        isAdmin={!!profile?.is_admin}
        onOpenAdmin={openAdmin}
        onOpenLegal={openLegal}
        onOpenStorefront={() => openSeller(session.user.id)}
        onOpenSeller={openSeller}
        onOpenOrders={openOrders}
        onOpenDashboard={openDashboard}
        onGoToSell={() => setTab('post')}
        onGoBrowse={() => setTab('browse')}
        hasEverOrdered={hasEverOrdered}
        onProfileRefresh={refreshProfile}
      />
    )
  } else {
    // guest, or a stale non-browse tab left over from before logging out —
    // Browse is the only screen that never assumes a session
    body = (
      <BrowseScreen
        listings={listings}
        loading={listingsLoading}
        onSelect={setSelected}
        favoriteIds={favoriteIds}
        onToggleFavorite={session ? toggleFavorite : () => requireAuth('Log in to save this listing.')}
        userLocation={profile?.lat != null && profile?.lng != null ? { lat: profile.lat, lng: profile.lng } : null}
        userNeighborhood={profile?.neighborhood ?? null}
        onOpenSeller={openSeller}
      />
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col" style={{ background: 'var(--paper)' }}>
      {!selected && !editingListing && !editingProfile && !showNotifications && !showAdmin && !showOrders && !showDashboard && !legalDoc && !viewingSellerId && !(tab === 'messages' && activeChat) && (
        <TopBar
          title={titles[tab]}
          avatarUrl={profile?.avatar_url ?? null}
          initials={(profile?.name ?? session?.user?.email ?? '?').trim().charAt(0).toUpperCase()}
          onAvatarClick={() => (session ? changeTab('profile') : requireAuth('Log in to view your profile.'))}
          unreadNotifications={notifications.filter((n) => !n.read).length}
          onBellClick={session ? openNotifications : undefined}
          isGuest={!session}
        />
      )}
      <div className="flex-1 overflow-y-auto pb-24">
        <div
          key={`${tab}-${selected?.id ?? ''}-${editingListing?.id ?? ''}-${editingProfile}-${showNotifications}-${showAdmin}-${showOrders}-${showDashboard}-${legalDoc ?? ''}-${viewingSellerId ?? ''}-${activeChatId ?? ''}`}
          className="screen-transition"
        >
          {body}
        </div>
      </div>
      <BottomNav
        active={tab}
        onChange={changeTab}
        unreadCount={chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0)}
        avatarUrl={profile?.avatar_url ?? null}
        initials={(profile?.name ?? session?.user?.email ?? '?').trim().charAt(0).toUpperCase()}
      />
    </div>
  )
}
