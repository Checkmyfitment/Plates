import { useState } from 'react'

export const STATUS_STYLES = {
  pending: { background: 'var(--mustard-soft)', color: 'var(--mustard-deep)', label: 'Pending' },
  confirmed: { background: 'var(--forest-soft)', color: 'var(--forest-dark)', label: 'Confirmed' },
  ready: { background: 'var(--mustard)', color: 'var(--forest-dark)', label: 'Ready for pickup' },
  completed: { background: 'var(--paper-dim)', color: 'var(--ink-soft)', label: 'Completed' },
  cancelled: { background: 'var(--plum-soft)', color: 'var(--plum)', label: 'Cancelled' },
  no_show: { background: 'var(--plum-soft)', color: 'var(--plum)', label: 'No-show' },
}

// "ready" is the one status whose meaning depends on how the buyer's
// getting the order — everything else reads fine for both pickup and delivery
function statusLabel(status, fulfillmentMethod) {
  if (status === 'ready' && fulfillmentMethod === 'delivery') return 'Out for delivery'
  return STATUS_STYLES[status].label
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.round(diffMs / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

// `group` comes from lib/orders.js's groupOrders(): { groupId, cartId, orders }
// — orders.length is 1 for a normal single-item order, or more for a
// multi-item cart checkout. Every action here applies to the whole group at
// once (a cart's line items always move through the same status together).
// `readOnly` hides all action buttons — used where a card is shown for
// reference only (e.g. My Orders' seller history), so there's exactly one
// place (Seller Dashboard) where a seller actually acts on an order.
export default function OrderCard({ group, role, onUpdateStatus, onReorder, onMarkPaid, readOnly }) {
  const { orders, cartId, groupId } = group
  const first = orders[0]
  const style = STATUS_STYLES[first.status]
  const total = orders.reduce((sum, o) => sum + o.priceAtOrder * o.quantity, 0)
  const [busy, setBusy] = useState(false)
  const [markingPaid, setMarkingPaid] = useState(false)
  const [confirmingAction, setConfirmingAction] = useState(null) // 'cancelled' | 'no_show' | 'pickup_verify' | null
  const [pickupInput, setPickupInput] = useState('')
  const [pickupError, setPickupError] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const act = async (status, reason) => {
    setBusy(true)
    try {
      await onUpdateStatus(groupId, status, !!cartId, reason)
    } finally {
      setBusy(false)
      setConfirmingAction(null)
      setPickupInput('')
      setPickupError(false)
      setCancelReason('')
    }
  }

  const markPaid = async () => {
    setMarkingPaid(true)
    try {
      await onMarkPaid(group)
    } finally {
      setMarkingPaid(false)
    }
  }

  const reorder = async () => {
    setBusy(true)
    try {
      await onReorder(group)
    } finally {
      setBusy(false)
    }
  }

  const isDelivery = first.fulfillmentMethod === 'delivery'

  return (
    <div className="card-elevated p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {first.subscriptionId && (
            <span
              className="inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium mb-1"
              style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
            >
              🔁 Recurring
            </span>
          )}
          {orders.map((o) => (
            <p key={o.id} className="text-sm font-medium truncate">
              {o.quantity}x {o.listingTitle}
            </p>
          ))}
          <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
            {role === 'buyer' ? `From ${first.sellerName}` : `For ${first.buyerName}`} · {timeAgo(first.createdAt)}
          </p>
          {isDelivery && (
            <p className="text-xs mt-1 font-medium" style={{ color: 'var(--forest-dark)' }}>
              🚗 Delivery{first.deliveryAddress ? ` — ${first.deliveryAddress}` : ''}
            </p>
          )}
          {first.note && (
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink)' }}>
              "{first.note}"
            </p>
          )}
          {role === 'buyer' &&
            !isDelivery &&
            first.pickupCode &&
            (first.status === 'confirmed' || first.status === 'ready') && (
              <div className="mt-2 px-3 py-1.5 rounded-lg inline-block" style={{ background: 'var(--mustard-soft)' }}>
                <p className="text-[10px] font-medium" style={{ color: 'var(--mustard-deep)' }}>
                  Show this code at pickup
                </p>
                <p
                  className="font-display text-lg leading-tight"
                  style={{ color: 'var(--mustard-deep)', letterSpacing: '0.1em' }}
                >
                  {first.pickupCode}
                </p>
              </div>
            )}
          {role === 'buyer' &&
            !isDelivery &&
            (first.status === 'confirmed' || first.status === 'ready') && (
              <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
                🤝 Meeting a neighbor for the first time? Pick somewhere well-lit and public if you
                can, and take a look before you pay.
              </p>
            )}
          {first.status !== 'cancelled' && (
            <div className="mt-2">
              {(role === 'buyer' ? first.buyerMarkedPaid : first.sellerMarkedPaid) ? (
                <p className="text-xs font-medium" style={{ color: 'var(--forest-dark)' }}>
                  ✓ You marked this paid
                </p>
              ) : (
                !readOnly && onMarkPaid && (
                  <button
                    onClick={markPaid}
                    disabled={markingPaid}
                    className="pressable text-xs underline disabled:opacity-60"
                    style={{ color: 'var(--ink-soft)' }}
                  >
                    💰 Mark as paid
                  </button>
                )
              )}
              {(role === 'buyer' ? first.sellerMarkedPaid : first.buyerMarkedPaid) && (
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                  {role === 'buyer' ? 'Seller' : 'Buyer'} marked this paid too
                </p>
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-medium" style={{ fontVariantNumeric: 'tabular-nums' }}>
            ${total.toFixed(2)}
          </p>
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-1"
            style={{ background: style.background, color: style.color }}
          >
            {statusLabel(first.status, first.fulfillmentMethod)}
          </span>
        </div>
      </div>

      {!readOnly && confirmingAction === 'pickup_verify' && (
        <div className="rounded-xl border p-3 mt-2.5" style={{ borderColor: 'var(--rule)' }}>
          <p className="text-xs font-medium">Enter the buyer's pickup code</p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            value={pickupInput}
            onChange={(e) => {
              setPickupInput(e.target.value.replace(/\D/g, ''))
              setPickupError(false)
            }}
            placeholder="4-digit code"
            className="w-full mt-2 px-3 py-2 rounded-lg border text-sm"
            style={{ borderColor: pickupError ? 'var(--plum)' : 'var(--rule)', letterSpacing: '0.2em' }}
          />
          {pickupError && (
            <p className="text-xs mt-1" style={{ color: 'var(--plum)' }}>
              That code doesn't match — check with the buyer.
            </p>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => {
                if (pickupInput === first.pickupCode) act('completed')
                else setPickupError(true)
              }}
              disabled={busy || pickupInput.length !== 4}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              Confirm pickup
            </button>
            <button
              onClick={() => {
                setConfirmingAction(null)
                setPickupInput('')
                setPickupError(false)
              }}
              disabled={busy}
              className="pressable text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Never mind
            </button>
          </div>
          <button
            onClick={() => act('completed')}
            disabled={busy}
            className="pressable text-[11px] mt-2 underline"
            style={{ color: 'var(--ink-soft)' }}
          >
            Can't get the code? Mark picked up anyway
          </button>
        </div>
      )}

      {!readOnly && confirmingAction && confirmingAction !== 'pickup_verify' && (
        <div className="rounded-xl border p-3 mt-2.5" style={{ borderColor: 'var(--plum)' }}>
          <p className="text-xs" style={{ color: 'var(--plum)' }}>
            {confirmingAction === 'no_show' ? 'Mark this order as a no-show?' : 'Cancel this order?'} This can't be
            undone.
          </p>
          {confirmingAction === 'cancelled' && (
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={role === 'seller' ? 'Reason (optional) — the buyer will see this' : 'Reason (optional) — the seller will see this'}
              maxLength={140}
              className="w-full mt-2 px-3 py-2 rounded-lg border text-xs"
              style={{ borderColor: 'var(--rule)' }}
            />
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => act(confirmingAction, confirmingAction === 'cancelled' ? cancelReason.trim() : undefined)}
              disabled={busy}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
              style={{ background: 'var(--plum)', color: 'white' }}
            >
              {confirmingAction === 'no_show' ? 'Yes, no-show' : 'Yes, cancel'}
            </button>
            <button
              onClick={() => {
                setConfirmingAction(null)
                setCancelReason('')
              }}
              disabled={busy}
              className="pressable text-xs px-3 py-1.5 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {!readOnly && !confirmingAction && (
        <>
          {role === 'buyer' && (first.status === 'pending' || first.status === 'confirmed') && (
            <button
              onClick={() => setConfirmingAction('cancelled')}
              className="pressable text-xs mt-2.5"
              style={{ color: 'var(--ink-soft)' }}
            >
              Cancel order
            </button>
          )}

          {role === 'buyer' && first.status === 'completed' && onReorder && (
            <button
              onClick={reorder}
              disabled={busy}
              className="pressable text-xs px-3 py-1.5 rounded-full font-medium mt-2.5 disabled:opacity-60"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              Order again
            </button>
          )}

          {role === 'seller' && first.status === 'pending' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => act('confirmed')}
                disabled={busy}
                className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
                style={{ background: 'var(--forest)', color: 'white' }}
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingAction('cancelled')}
                className="pressable text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
            </div>
          )}

          {role === 'seller' && first.status === 'confirmed' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => act('ready')}
                disabled={busy}
                className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
                style={{ background: 'var(--forest)', color: 'white' }}
              >
                Mark ready
              </button>
              <button
                onClick={() => setConfirmingAction('cancelled')}
                className="pressable text-xs px-3 py-1.5 rounded-full border"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
            </div>
          )}

          {role === 'seller' && first.status === 'ready' && (
            <div className="flex gap-2 mt-2.5">
              <button
                onClick={() => (isDelivery || !first.pickupCode ? act('completed') : setConfirmingAction('pickup_verify'))}
                disabled={busy}
                className="pressable text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
                style={{ background: 'var(--forest)', color: 'white' }}
              >
                {isDelivery ? 'Mark delivered' : 'Mark picked up'}
              </button>
              {!isDelivery && (
                <button
                  onClick={() => setConfirmingAction('no_show')}
                  className="pressable text-xs px-3 py-1.5 rounded-full border"
                  style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
                >
                  No-show
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
