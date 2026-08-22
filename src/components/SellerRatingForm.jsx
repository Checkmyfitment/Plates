import { useEffect, useState } from 'react'
import { fetchMyReview, upsertReview } from '../lib/reviews'
import { fetchCompletedOrderCount } from '../lib/orders'

const dimensions = [
  { key: 'taste', label: 'Taste' },
  { key: 'portion', label: 'Portion size' },
  { key: 'value', label: 'Value for price' },
]

export default function SellerRatingForm({ sellerId, reviewerId, listingId, onSaved }) {
  const [scores, setScores] = useState({ taste: 0, portion: 0, value: 0 })
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [eligible, setEligible] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchMyReview(sellerId, reviewerId), fetchCompletedOrderCount(reviewerId, sellerId)])
      .then(([existing, completedOrders]) => {
        if (cancelled) return
        if (existing) {
          setScores({
            taste: existing.taste_rating ?? existing.rating ?? 0,
            portion: existing.portion_rating ?? existing.rating ?? 0,
            value: existing.value_rating ?? existing.rating ?? 0,
          })
          setComment(existing.comment ?? '')
        }
        // grandfather anyone who already left a review before this
        // restriction existed — otherwise require a completed order
        setEligible(!!existing || completedOrders > 0)
      })
      .catch((err) => console.error('Failed to load your review', err))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sellerId, reviewerId])

  const allRated = scores.taste > 0 && scores.portion > 0 && scores.value > 0
  const overall = allRated ? Math.round((scores.taste + scores.portion + scores.value) / 3) : 0

  const setScore = (key, n) => {
    setScores((s) => ({ ...s, [key]: n }))
    setSaved(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!allRated) return
    setSaving(true)
    setError('')
    try {
      await upsertReview({
        sellerId,
        reviewerId,
        listingId,
        rating: overall,
        comment: comment.trim(),
        tasteRating: scores.taste,
        portionRating: scores.portion,
        valueRating: scores.value,
      })
      setSaved(true)
      onSaved?.()
    } catch (err) {
      setError(err.message || 'Could not save your rating.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  if (!eligible) {
    return (
      <div className="mt-4 card-elevated p-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
        Complete an order from this seller to leave a rating.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-4 card-elevated p-3">
      <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
        Rate this seller
      </p>
      <div className="flex flex-col gap-2 mt-2">
        {dimensions.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: 'var(--ink)' }}>
              {label}
            </span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setScore(key, n)}
                  aria-label={`${label}: ${n} star${n > 1 ? 's' : ''}`}
                  className="text-lg leading-none"
                  style={{ color: n <= scores[key] ? 'var(--mustard-deep)' : 'var(--rule)' }}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {allRated && (
        <p className="text-xs mt-2" style={{ color: 'var(--ink-soft)' }}>
          Overall: {'★'.repeat(overall)}
          {'☆'.repeat(5 - overall)}
        </p>
      )}
      <textarea
        rows={2}
        value={comment}
        onChange={(e) => {
          setComment(e.target.value)
          setSaved(false)
        }}
        placeholder="Optional comment…"
        className="field resize-none mt-2"
        maxLength={1000}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: 'var(--plum)' }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!allRated || saving}
        className="mt-2 text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save rating'}
      </button>
    </form>
  )
}
