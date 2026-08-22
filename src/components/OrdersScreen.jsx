import { useEffect, useState } from 'react'
import Placeholder from './Placeholder'
import OrderCard from './OrderCard'
import {
  fetchBuyerOrders,
  fetchSellerOrders,
  updateOrderStatus,
  updateCartStatus,
  groupOrders,
  markOrderPaid,
} from '../lib/orders'
import { subscribeToTable } from '../lib/realtime'
import { useToast } from '../context/ToastContext'

export default function OrdersScreen({ userId, onBack, onReorder, onOpenDashboard }) {
  const toast = useToast()
  const [buying, setBuying] = useState([])
  const [selling, setSelling] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = () => {
    Promise.all([fetchBuyerOrders(userId), fetchSellerOrders(userId)])
      .then(([buyerOrders, sellerOrders]) => {
        setBuying(buyerOrders)
        setSelling(sellerOrders)
      })
      .catch((err) => console.error('Failed to live-refresh orders', err))
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchBuyerOrders(userId), fetchSellerOrders(userId)])
      .then(([buyerOrders, sellerOrders]) => {
        setBuying(buyerOrders)
        setSelling(sellerOrders)
      })
      .catch((err) => {
        console.error('Failed to load orders', err)
        toast.error('Could not load orders — try again.')
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // live-refresh on any order change involving me (new order, status
  // update from either side) — row-level security already scopes which
  // rows this delivers
  useEffect(() => {
    const unsubscribe = subscribeToTable('orders', { onChange: reload })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const handleUpdateStatus = async (groupId, status, isCart, reason) => {
    try {
      if (isCart) {
        const updated = await updateCartStatus(groupId, status, reason)
        const updatedIds = new Set(updated.map((o) => o.id))
        const merge = (prev) => prev.map((o) => (updatedIds.has(o.id) ? updated.find((u) => u.id === o.id) : o))
        setBuying(merge)
        setSelling(merge)
      } else {
        const updated = await updateOrderStatus(groupId, status, reason)
        setBuying((prev) => prev.map((o) => (o.id === groupId ? updated : o)))
        setSelling((prev) => prev.map((o) => (o.id === groupId ? updated : o)))
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
      setBuying((prev) => prev.map((o) => (paidIds.has(o.id) ? { ...o, buyerMarkedPaid: true } : o)))
    } catch (err) {
      console.error('Failed to mark order paid', err)
      toast.error('Could not update that — try again.')
    }
  }

  const buyingGroups = groupOrders(buying)
  const sellingGroups = groupOrders(selling)

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
          My Orders
        </h2>
      </div>

      {loading ? (
        <div className="flex flex-col gap-2.5">
          <div className="skeleton h-20 w-full rounded-2xl" />
          <div className="skeleton h-20 w-full rounded-2xl" />
        </div>
      ) : (
        <>
          <h3 className="text-xs font-medium mb-2.5" style={{ color: 'var(--ink-soft)' }}>
            Orders you placed
          </h3>
          {buyingGroups.length === 0 ? (
            <Placeholder compact icon="🛒" title="No orders yet" body="Orders you place will show up here." />
          ) : (
            <div className="flex flex-col gap-2.5">
              {buyingGroups.map((g) => (
                <OrderCard
                  key={g.groupId}
                  group={g}
                  role="buyer"
                  onUpdateStatus={handleUpdateStatus}
                  onReorder={onReorder}
                  onMarkPaid={handleMarkPaid}
                />
              ))}
            </div>
          )}

          {sellingGroups.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-3 mb-2.5 mt-6">
                <h3 className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
                  Orders to fulfill
                </h3>
                {onOpenDashboard && (
                  <button
                    onClick={onOpenDashboard}
                    className="pressable text-xs font-medium"
                    style={{ color: 'var(--forest-dark)' }}
                  >
                    Manage in Seller Dashboard →
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {sellingGroups.map((g) => (
                  <OrderCard key={g.groupId} group={g} role="seller" readOnly />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
