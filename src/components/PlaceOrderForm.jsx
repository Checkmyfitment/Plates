import { useRef, useState } from 'react'

export default function PlaceOrderForm({
  price,
  onSubmit,
  maxQuantity,
  minOrderAmount,
  deliveryAvailable,
  deliveryNotes,
  allowRepeat,
}) {
  const [quantity, setQuantity] = useState(1)
  const [note, setNote] = useState('')
  const [fulfillment, setFulfillment] = useState('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [repeat, setRepeat] = useState(false)
  const [repeatInterval, setRepeatInterval] = useState(7)
  const [submitting, setSubmitting] = useState(false)
  // setSubmitting alone isn't enough to block a rapid double-click: two
  // clicks fired in the same tick both read the same pre-update `submitting`
  // value, since React doesn't commit the state update between them. A ref
  // updates synchronously, so the second click sees it immediately.
  const submittingRef = useRef(false)
  const effectiveMax = maxQuantity != null ? Math.min(maxQuantity, 99) : 99
  const atMax = quantity >= effectiveMax
  const needsAddress = deliveryAvailable && fulfillment === 'delivery'
  const orderTotal = price * quantity
  const belowMinimum = minOrderAmount != null && orderTotal < minOrderAmount

  const submit = async () => {
    if (submittingRef.current) return
    if (needsAddress && !deliveryAddress.trim()) return
    if (belowMinimum) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await onSubmit(quantity, note.trim(), fulfillment, deliveryAddress.trim(), repeat ? repeatInterval : null)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 card-elevated p-3.5">
      <p className="text-xs font-medium mb-2.5" style={{ color: 'var(--ink-soft)' }}>
        Place an order
      </p>
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Quantity
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="pressable w-8 h-8 rounded-full border flex items-center justify-center font-bold"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            −
          </button>
          <span className="text-sm font-medium w-4 text-center" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {quantity}
          </span>
          <button
            onClick={() => setQuantity((q) => Math.min(effectiveMax, q + 1))}
            disabled={atMax}
            aria-label="Increase quantity"
            className="pressable w-8 h-8 rounded-full border flex items-center justify-center font-bold disabled:opacity-40"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
          >
            +
          </button>
        </div>
      </div>
      {maxQuantity != null && (
        <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--ink-soft)' }}>
          {maxQuantity} available
        </p>
      )}
      {minOrderAmount != null && (
        <p className="text-[11px] mt-1" style={{ color: belowMinimum ? 'var(--plum)' : 'var(--ink-soft)' }}>
          {belowMinimum
            ? `$${minOrderAmount.toFixed(2)} minimum order — add ${Math.ceil((minOrderAmount - orderTotal) / price)} more`
            : `$${minOrderAmount.toFixed(2)} minimum order`}
        </p>
      )}

      {deliveryAvailable && (
        <div className="mt-3">
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            How will you get it?
          </span>
          <div className="flex gap-2 mt-1.5">
            {['pickup', 'delivery'].map((option) => (
              <button
                key={option}
                onClick={() => setFulfillment(option)}
                className="pressable flex-1 py-2 rounded-xl text-xs font-bold capitalize border"
                style={
                  fulfillment === option
                    ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                    : { borderColor: 'var(--rule)', color: 'var(--ink)' }
                }
              >
                {option}
              </button>
            ))}
          </div>
          {fulfillment === 'delivery' && (
            <>
              {deliveryNotes && (
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
                  {deliveryNotes}
                </p>
              )}
              <input
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Delivery address"
                className="field mt-1.5 text-sm w-full"
                maxLength={200}
              />
            </>
          )}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Anything the seller should know? (optional)"
        rows={2}
        className="field mt-3 text-sm w-full"
        maxLength={500}
      />

      {allowRepeat && (
        <div className="mt-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={repeat} onChange={(e) => setRepeat(e.target.checked)} />
            🔁 Make this a recurring order
          </label>
          {repeat && (
            <div className="flex gap-2 mt-1.5">
              {[
                { days: 7, label: 'Weekly' },
                { days: 14, label: 'Every 2 weeks' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setRepeatInterval(opt.days)}
                  className="pressable flex-1 py-2 rounded-xl text-xs font-bold border"
                  style={
                    repeatInterval === opt.days
                      ? { background: 'var(--forest)', color: 'white', borderColor: 'var(--forest)' }
                      : { borderColor: 'var(--rule)', color: 'var(--ink)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
          {repeat && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--ink-soft)' }}>
              You'll get this order automatically placed on this schedule until you cancel it from
              your profile — you still pay the seller directly each time, same as any Plates order.
            </p>
          )}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting || belowMinimum || (needsAddress && !deliveryAddress.trim())}
        className="pressable w-full mt-3 py-3.5 rounded-2xl font-bold text-sm disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {submitting ? 'Placing order…' : `Place order — $${orderTotal.toFixed(2)}`}
      </button>
    </div>
  )
}
