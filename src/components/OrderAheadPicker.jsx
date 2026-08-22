import { useEffect, useState } from 'react'
import {
  fetchSchedules,
  fetchOccurrenceCounts,
  fetchMyOccurrenceReservations,
  reserveOccurrence,
  cancelOccurrenceReservation,
  computeUpcomingOccurrences,
  occurrenceKey,
  formatOccurrenceDate,
  formatTimeRange,
} from '../lib/schedules'

const OCCURRENCES_PER_SCHEDULE = 4

export default function OrderAheadPicker({ listingId, buyerId }) {
  const [occurrences, setOccurrences] = useState([])
  const [counts, setCounts] = useState(new Map())
  const [mine, setMine] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busyKey, setBusyKey] = useState(null)
  const [error, setError] = useState('')

  const load = () => {
    fetchSchedules(listingId)
      .then(async (schedules) => {
        const all = schedules.flatMap((s) =>
          computeUpcomingOccurrences(s.weekday, OCCURRENCES_PER_SCHEDULE).map((date) => ({
            scheduleId: s.id,
            occurrenceDate: date,
            pickupStart: s.pickupStart,
            pickupEnd: s.pickupEnd,
            capacity: s.capacity,
          })),
        )
        all.sort((a, b) => a.occurrenceDate.localeCompare(b.occurrenceDate))
        setOccurrences(all)

        const scheduleIds = schedules.map((s) => s.id)
        const [countMap, mySet] = await Promise.all([
          fetchOccurrenceCounts(scheduleIds),
          fetchMyOccurrenceReservations(buyerId, scheduleIds),
        ])
        setCounts(countMap)
        setMine(mySet)
      })
      .catch((err) => console.error('Failed to load cook schedule', err))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, buyerId])

  const handleReserve = async (occ) => {
    const key = occurrenceKey(occ.scheduleId, occ.occurrenceDate)
    setError('')
    setBusyKey(key)
    setCounts((prev) => new Map(prev).set(key, (prev.get(key) ?? 0) + 1))
    setMine((prev) => new Set(prev).add(key))
    try {
      await reserveOccurrence(occ.scheduleId, occ.occurrenceDate, buyerId)
    } catch (err) {
      setCounts((prev) => new Map(prev).set(key, Math.max(0, (prev.get(key) ?? 1) - 1)))
      setMine((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
      setError(err.message || 'Could not reserve that date — it may be full.')
    } finally {
      setBusyKey(null)
    }
  }

  const handleCancel = async (occ) => {
    const key = occurrenceKey(occ.scheduleId, occ.occurrenceDate)
    setError('')
    setBusyKey(key)
    setCounts((prev) => new Map(prev).set(key, Math.max(0, (prev.get(key) ?? 0) - 1)))
    setMine((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
    try {
      await cancelOccurrenceReservation(occ.scheduleId, occ.occurrenceDate, buyerId)
    } catch (err) {
      console.error('Failed to cancel reservation', err)
      load()
    } finally {
      setBusyKey(null)
    }
  }

  if (loading || occurrences.length === 0) return null

  return (
    <div className="mt-4 card-elevated p-3">
      <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
        📅 Order ahead
      </p>
      <div className="flex flex-col gap-1.5 mt-2">
        {occurrences.map((occ) => {
          const key = occurrenceKey(occ.scheduleId, occ.occurrenceDate)
          const reservedCount = counts.get(key) ?? 0
          const isMine = mine.has(key)
          const full = occ.capacity != null && reservedCount >= occ.capacity && !isMine
          return (
            <div
              key={key}
              className="flex items-center justify-between gap-2 text-xs rounded-lg px-2.5 py-2"
              style={{ background: isMine ? 'var(--forest-soft)' : 'var(--paper-dim)' }}
            >
              <span>
                {formatOccurrenceDate(occ.occurrenceDate)} · {formatTimeRange(occ.pickupStart, occ.pickupEnd)}
                {occ.capacity != null && (
                  <span style={{ color: 'var(--ink-soft)' }}>
                    {' '}
                    · {Math.max(0, occ.capacity - reservedCount)} spot{occ.capacity - reservedCount === 1 ? '' : 's'} left
                  </span>
                )}
              </span>
              {isMine ? (
                <button
                  type="button"
                  onClick={() => handleCancel(occ)}
                  disabled={busyKey === key}
                  className="pressable shrink-0 px-2.5 py-1 rounded-full font-medium disabled:opacity-60"
                  style={{ background: 'var(--forest)', color: 'white' }}
                >
                  ✓ Ordered
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleReserve(occ)}
                  disabled={full || busyKey === key}
                  className="pressable shrink-0 px-2.5 py-1 rounded-full border font-medium disabled:opacity-50"
                  style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
                >
                  {full ? 'Full' : 'Order this date'}
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
