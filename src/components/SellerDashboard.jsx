import { useEffect, useState } from 'react'
import Placeholder from './Placeholder'
import OrderCard from './OrderCard'
import WeeklyBarChart from './WeeklyBarChart'
import { fetchSellerOrders, updateOrderStatus, updateCartStatus, groupOrders, markOrderPaid, ordersToIncomeCSV } from '../lib/orders'
import { fetchMyPromotionRequest } from '../lib/promotions'
import { fetchRestockCounts } from '../lib/restock'
import { setVacationMode } from '../lib/profiles'
import { broadcastToBuyers } from '../lib/notifications'
import { fetchSellerWeeklyEarnings } from '../lib/analytics'
import { subscribeToTable } from '../lib/realtime'
import { useToast } from '../context/ToastContext'

function todayLocalDateString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function SellerDashboard({
  userId,
  listings,
  sellerRating,
  profile,
  onProfileRefresh,
  onBack,
  onEditListing,
  onDuplicate,
}) {
  const toast = useToast()
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [promoStatus, setPromoStatus] = useState(new Map())
  const [restockCounts, setRestockCounts] = useState(new Map())
  const [reposting, setReposting] = useState(null)
  const [vacationBusy, setVacationBusy] = useState(false)
  const [bulkConfirmBusy, setBulkConfirmBusy] = useState(false)
  const [broadcastOpen, setBroadcastOpen] = useState(false)
  const [broadcastText, setBroadcastText] = useState('')
  const [broadcastSending, setBroadcastSending] = useState(false)
  const [weeklyEarnings, setWeeklyEarnings] = useState(null)

  const yourListings = listings.filter((l) => l.sellerId === userId && !l.unclaimedStoreId)
  const totalViews = yourListings.reduce((sum, l) => sum + (l.views || 0), 0)

  useEffect(() => {
    setOrdersLoading(true)
    fetchSellerOrders(userId)
      .then(setOrders)
      .catch((err) => {
        console.error('Failed to load orders', err)
        toast.error('Could not load orders — try again.')
      })
      .finally(() => setOrdersLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    fetchSellerWeeklyEarnings()
      .then(setWeeklyEarnings)
      .catch((err) => console.error('Failed to load earnings trend', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // live-refresh on any new order or status change — a new order coming
  // in while this screen is open should show up without a manual reload
  useEffect(() => {
    const unsubscribe = subscribeToTable('orders', {
      filter: `seller_id=eq.${userId}`,
      onChange: () => {
        fetchSellerOrders(userId)
          .then(setOrders)
          .catch((err) => console.error('Failed to live-refresh orders', err))
      },
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  useEffect(() => {
    const unfeatured = yourListings.filter((l) => !l.featured)
    if (unfeatured.length === 0) return
    Promise.all(
      unfeatured.map((l) =>
        fetchMyPromotionRequest(l.id, userId)
          .then((req) => [l.id, req?.status ?? null])
          .catch(() => [l.id, null]),
      ),
    ).then((entries) => setPromoStatus(new Map(entries)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, yourListings.length])

  useEffect(() => {
    fetchRestockCounts()
      .then(setRestockCounts)
      .catch((err) => console.error('Failed to load restock counts', err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // onDuplicate (App.jsx's duplicateListing) already shows its own
  // success/error toast and never throws — this just tracks button-busy
  // state for whichever row's repost was tapped
  const handleRepost = async (listing) => {
    setReposting(listing.id)
    await onDuplicate(listing)
    setReposting(null)
  }

  const handleUpdateStatus = async (groupId, status, isCart, reason) => {
    try {
      if (isCart) {
        const updated = await updateCartStatus(groupId, status, reason)
        const updatedIds = new Set(updated.map((o) => o.id))
        setOrders((prev) => prev.map((o) => (updatedIds.has(o.id) ? updated.find((u) => u.id === o.id) : o)))
      } else {
        const updated = await updateOrderStatus(groupId, status, reason)
        setOrders((prev) => prev.map((o) => (o.id === groupId ? updated : o)))
      }
    } catch (err) {
      console.error('Failed to update order', err)
      toast.error('Could not update that order — try again.')
    }
  }

  const handleMarkPaid = async (group) => {
    try {
      await Promise.all(group.orders.map((o) => markOrderPaid(o.id, true)))
      const paidIds = new Set(group.orders.map((o) => o.id))
      setOrders((prev) => prev.map((o) => (paidIds.has(o.id) ? { ...o, sellerMarkedPaid: true } : o)))
    } catch (err) {
      console.error('Failed to mark order paid', err)
      toast.error('Could not update that — try again.')
    }
  }

  // rolls up confirmed/ready orders for listings scheduled to be picked up
  // today, so a seller can see totals to prep instead of scanning individual
  // order cards — listings without a structured pickup date can't be
  // attributed to "today" so they're left out of this list
  const listingsById = new Map(listings.map((l) => [l.id, l]))
  const today = todayLocalDateString()
  const prepMap = new Map()
  for (const o of orders) {
    if (o.status !== 'confirmed' && o.status !== 'ready') continue
    const listing = listingsById.get(o.listingId)
    if (listing?.pickupDate !== today) continue
    const entry = prepMap.get(o.listingId) ?? { title: listing?.title ?? o.listingTitle, quantity: 0 }
    entry.quantity += o.quantity
    prepMap.set(o.listingId, entry)
  }
  const prepList = [...prepMap.values()].sort((a, b) => b.quantity - a.quantity)

  const openOrders = orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'ready')
  const openGroups = groupOrders(openOrders)
  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const confirmedCount = orders.filter((o) => o.status === 'confirmed').length
  const readyCount = orders.filter((o) => o.status === 'ready').length
  const pendingGroups = openGroups.filter((g) => g.orders[0].status === 'pending')

  const handleConfirmAllPending = async () => {
    setBulkConfirmBusy(true)
    try {
      await Promise.all(pendingGroups.map((g) => handleUpdateStatus(g.groupId, 'confirmed', !!g.cartId)))
    } finally {
      setBulkConfirmBusy(false)
    }
  }

  const weekMs = 7 * 24 * 60 * 60 * 1000
  const weekOrders = orders.filter((o) => o.status === 'completed' && Date.now() - new Date(o.createdAt).getTime() <= weekMs)
  const weekTotal = weekOrders.reduce((sum, o) => sum + o.priceAtOrder * o.quantity, 0)
  const weekOrderCount = groupOrders(weekOrders).length
  const completedOrderCount = orders.filter((o) => o.status === 'completed').length

  const exportIncome = () => {
    const csv = ordersToIncomeCSV(orders)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plates-income-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const toggleVacation = async () => {
    const next = !profile?.on_vacation
    setVacationBusy(true)
    try {
      await setVacationMode(userId, next)
      await onProfileRefresh?.()
      toast.success(
        next ? "You're in vacation mode — buyers can't order from you right now." : 'Welcome back — your listings are visible again.',
      )
    } catch (err) {
      console.error('Failed to update vacation mode', err)
      toast.error('Could not update that — try again.')
    } finally {
      setVacationBusy(false)
    }
  }

  const handleBroadcast = async () => {
    if (!broadcastText.trim()) return
    setBroadcastSending(true)
    try {
      const count = await broadcastToBuyers(broadcastText.trim())
      toast.success(count > 0 ? `Sent to ${count} ${count === 1 ? 'person' : 'people'}.` : "You don't have any past customers or followers to message yet.")
      setBroadcastText('')
      setBroadcastOpen(false)
    } catch (err) {
      console.error('Failed to send broadcast', err)
      toast.error(err.message || 'Could not send that — try again.')
    } finally {
      setBroadcastSending(false)
    }
  }

  return (
    <div className="px-5 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Seller Dashboard
        </h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-elevated p-4 text-center">
          <div className="icon-badge mx-auto mb-2" aria-hidden="true" style={{ background: 'var(--forest-soft)' }}>
            🍽️
          </div>
          <p className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {yourListings.length}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Listings
          </p>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="icon-badge mx-auto mb-2" aria-hidden="true" style={{ background: 'var(--forest-soft)' }}>
            👁️
          </div>
          <p className="font-display text-2xl" style={{ color: 'var(--forest-dark)' }}>
            {totalViews}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            Total views
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
            {sellerRating ? `${sellerRating.reviewCount} rating${sellerRating.reviewCount === 1 ? '' : 's'}` : 'No ratings yet'}
          </p>
        </div>
      </div>

      <div
        className="card-elevated p-4 mb-3 flex items-center justify-between gap-3"
        style={{ background: 'var(--forest-soft)' }}
      >
        <div className="min-w-0">
          <p className="font-display text-3xl" style={{ color: 'var(--forest-dark)' }}>
            ${weekTotal.toFixed(2)}
          </p>
          <p className="text-xs mt-1 font-medium" style={{ color: 'var(--forest-dark)', opacity: 0.7 }}>
            This week · {weekOrderCount} order{weekOrderCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={toggleVacation}
          disabled={vacationBusy}
          className="pressable shrink-0 text-xs px-3 py-2 rounded-full font-medium disabled:opacity-60"
          style={
            profile?.on_vacation
              ? { background: 'var(--plum)', color: 'white' }
              : { background: 'var(--card)', color: 'var(--ink)' }
          }
        >
          {profile?.on_vacation ? '🏖️ On vacation' : '🏖️ Pause listings'}
        </button>
      </div>

      {weeklyEarnings && weeklyEarnings.some((w) => w.gmv > 0) && (
        <div className="card-elevated p-4 mb-3">
          <WeeklyBarChart
            title="Your earnings (last 8 weeks)"
            data={weeklyEarnings}
            valueKey="gmv"
            formatValue={(v) => `$${v.toFixed(2)}`}
          />
        </div>
      )}

      {completedOrderCount > 0 && (
        <div className="card-elevated p-4 mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">📄 Export your income</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
              A CSV of your {completedOrderCount} completed order{completedOrderCount === 1 ? '' : 's'} — handy for your own
              records at tax time. Plates doesn't process payments, so this is just a summary of what you've sold.
            </p>
          </div>
          <button
            onClick={exportIncome}
            className="pressable shrink-0 text-xs px-3 py-2 rounded-full font-medium"
            style={{ background: 'var(--card)', color: 'var(--ink)' }}
          >
            Download CSV
          </button>
        </div>
      )}

      <div className="card-elevated p-4 mb-3">
        {broadcastOpen ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
              Message your past customers and followers
            </p>
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              rows={2}
              placeholder="e.g. Kimchi is back this week!"
              className="field resize-none text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleBroadcast}
                disabled={broadcastSending || !broadcastText.trim()}
                className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
                style={{ background: 'var(--forest)', color: 'white' }}
              >
                {broadcastSending ? 'Sending…' : 'Send'}
              </button>
              <button
                onClick={() => {
                  setBroadcastOpen(false)
                  setBroadcastText('')
                }}
                disabled={broadcastSending}
                className="pressable text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setBroadcastOpen(true)}
            className="pressable w-full text-left flex items-center gap-3"
          >
            <div className="icon-badge" aria-hidden="true" style={{ background: 'var(--mustard-soft)' }}>
              📢
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Message your buyers</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                Reach past customers and followers
              </p>
            </div>
            <span style={{ color: 'var(--ink-soft)' }}>›</span>
          </button>
        )}
      </div>

      {prepList.length > 0 && (
        <div className="card-elevated p-4 mb-6" style={{ background: 'var(--mustard-soft)' }}>
          <p className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: 'var(--mustard-deep)' }}>
            <span className="icon-badge" aria-hidden="true" style={{ width: 22, height: 22, fontSize: 12, background: 'rgba(255,255,255,0.5)' }}>
              🍳
            </span>
            Today's prep list
          </p>
          <div className="flex flex-col gap-1">
            {prepList.map((item) => (
              <p key={item.title} className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                {item.quantity}x {item.title}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display text-base" style={{ color: 'var(--forest-dark)' }}>
          Orders needing attention{' '}
          {pendingCount + confirmedCount + readyCount > 0 && (
            <span className="font-normal text-xs" style={{ color: 'var(--ink-soft)' }}>
              ({pendingCount} pending, {confirmedCount} confirmed, {readyCount} ready)
            </span>
          )}
        </h3>
        {pendingGroups.length > 1 && (
          <button
            onClick={handleConfirmAllPending}
            disabled={bulkConfirmBusy}
            className="pressable shrink-0 text-xs font-medium disabled:opacity-60"
            style={{ color: 'var(--forest-dark)' }}
          >
            Confirm all pending
          </button>
        )}
      </div>
      {ordersLoading ? (
        <div className="skeleton h-20 w-full rounded-2xl" />
      ) : openGroups.length === 0 ? (
        <Placeholder compact icon="✅" title="All caught up" body="No orders waiting on you right now." />
      ) : (
        <div className="flex flex-col gap-2.5">
          {openGroups.map((g) => (
            <OrderCard key={g.groupId} group={g} role="seller" onUpdateStatus={handleUpdateStatus} onMarkPaid={handleMarkPaid} />
          ))}
        </div>
      )}

      <h3 className="font-display text-base mb-3 mt-7" style={{ color: 'var(--forest-dark)' }}>
        Your listings
      </h3>
      {yourListings.length === 0 ? (
        <Placeholder compact icon="🍽️" title="Nothing posted yet" body="Head to the Sell tab to list something." />
      ) : (
        <div className="flex flex-col gap-2">
          {yourListings.map((l) => {
            const promo = promoStatus.get(l.id)
            const soldOut = l.available === false
            const restockCount = restockCounts.get(l.id) ?? 0
            return (
              <div key={l.id} className="card-elevated flex items-center justify-between gap-2 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{l.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                    👁️ {l.views || 0} views
                  </p>
                  {soldOut && restockCount > 0 && (
                    <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--mustard-deep)' }}>
                      🔔 {restockCount} {restockCount === 1 ? 'person wants' : 'people want'} this back
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {l.featured ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}>
                      ✨ Featured
                    </span>
                  ) : promo === 'pending' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}>
                      ⏳ Pending
                    </span>
                  ) : null}
                  {soldOut && onDuplicate && (
                    <button
                      onClick={() => handleRepost(l)}
                      disabled={reposting === l.id}
                      className="pressable text-[10px] px-2.5 py-1 rounded-full font-medium disabled:opacity-60"
                      style={{ background: 'var(--forest)', color: 'white' }}
                    >
                      {reposting === l.id ? 'Reposting…' : '🔁 Repost'}
                    </button>
                  )}
                  {onEditListing && (
                    <button
                      onClick={() => onEditListing(l)}
                      aria-label={`Edit ${l.title}`}
                      className="pressable icon-badge"
                      style={{ background: 'var(--paper-dim)', width: 30, height: 30, fontSize: 13 }}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
