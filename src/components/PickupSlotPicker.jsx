import { useEffect, useState } from 'react'
import { fetchSlots, fetchMyReservedSlotIds, reserveSlot, cancelReservation, formatSlotRange } from '../lib/slots'

export default function PickupSlotPicker({ listingId, buyerId }) {
  const [slots, setSlots] = useState([])
  const [myReservations, setMyReservations] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busySlotId, setBusySlotId] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    fetchSlots(listingId)
      .then(async (s) => {
        setSlots(s)
        const mine = await fetchMyReservedSlotIds(buyerId, s.map((slot) => slot.id))
        setMyReservations(mine)
      })
      .catch((err) => console.error('Failed to load pickup slots', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, buyerId])

  const upcoming = slots.filter((s) => new Date(s.endsAt) > new Date())

  const handleReserve = async (slot) => {
    setError('')
    setBusySlotId(slot.id)
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, reservedCount: s.reservedCount + 1 } : s)))
    setMyReservations((prev) => new Set(prev).add(slot.id))
    try {
      await reserveSlot(slot.id, buyerId)
    } catch (err) {
      setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, reservedCount: Math.max(0, s.reservedCount - 1) } : s)))
      setMyReservations((prev) => {
        const next = new Set(prev)
        next.delete(slot.id)
        return next
      })
      setError(err.message || "Could not reserve that slot — it may be full.")
    } finally {
      setBusySlotId(null)
    }
  }

  const handleCancel = async (slot) => {
    setError('')
    setBusySlotId(slot.id)
    setSlots((prev) => prev.map((s) => (s.id === slot.id ? { ...s, reservedCount: Math.max(0, s.reservedCount - 1) } : s)))
    setMyReservations((prev) => {
      const next = new Set(prev)
      next.delete(slot.id)
      return next
    })
    try {
      await cancelReservation(slot.id, buyerId)
    } catch (err) {
      console.error('Failed to cancel reservation', err)
      load()
    } finally {
      setBusySlotId(null)
    }
  }

  if (loading || upcoming.length === 0) return null

  return (
    <div className="mt-4 card-elevated p-3">
      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
        📅 Reserve a pickup time
      </p>
      <div className="flex flex-col gap-1.5 mt-2">
        {upcoming.map((slot) => {
          const full = slot.capacity != null && slot.reservedCount >= slot.capacity && !myReservations.has(slot.id)
          const mine = myReservations.has(slot.id)
          return (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-2"
              style={{ background: mine ? 'var(--forest-soft)' : 'var(--paper-dim)' }}
            >
              <span>
                {formatSlotRange(slot.startsAt, slot.endsAt)}
                {slot.capacity != null && (
                  <span style={{ color: 'var(--ink-soft)' }}>
                    {' '}
                    · {Math.max(0, slot.capacity - slot.reservedCount)} spot{slot.capacity - slot.reservedCount === 1 ? '' : 's'} left
                  </span>
                )}
              </span>
              {mine ? (
                <button
                  type="button"
                  onClick={() => handleCancel(slot)}
                  disabled={busySlotId === slot.id}
                  className="pressable shrink-0 px-2.5 py-1 rounded-full font-medium disabled:opacity-60"
                  style={{ background: 'var(--forest)', color: 'white' }}
                >
                  ✓ I'm coming
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReserve(slot)}
                  disabled={full || busySlotId === slot.id}
                  className="pressable shrink-0 px-2.5 py-1 rounded-full border font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
                >
                  {full ? 'Full' : "I'm coming"}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {error && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--plum)' }}>
          {error}
        </p>
      )}
    </div>
  )
}
