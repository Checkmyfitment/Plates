import { useEffect, useState } from 'react'
import { requestPromotion, fetchMyPromotionRequest } from '../lib/promotions'
import { useToast } from '../context/ToastContext'

function formatUntil(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function PromotionRequestCard({ listingId, sellerId, featured, featuredUntil }) {
  const toast = useToast()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (featured) {
      setLoading(false)
      return
    }
    fetchMyPromotionRequest(listingId, sellerId)
      .then(setRequest)
      .catch((err) => console.error('Failed to load promotion request', err))
      .finally(() => setLoading(false))
  }, [listingId, sellerId, featured])

  const submit = async () => {
    setSubmitting(true)
    try {
      await requestPromotion(listingId, sellerId)
      setRequest({ status: 'pending' })
      toast.success("Request sent — we'll reach out to arrange payment.")
    } catch (err) {
      console.error('Failed to request promotion', err)
      toast.error('Could not send that request — try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (featured) {
    const until = formatUntil(featuredUntil)
    return (
      <div
        className="mt-3 card-elevated p-3 text-xs font-medium"
        style={{ background: 'var(--plum-soft)', color: 'var(--plum)' }}
      >
        ✨ {until ? `Featured until ${until}` : 'This listing is currently featured'}
      </div>
    )
  }

  if (loading) return null

  if (request?.status === 'pending') {
    return (
      <div className="mt-3 card-elevated p-3 text-xs" style={{ color: 'var(--ink-soft)' }}>
        ⏳ Promotion request sent — we'll reach out to arrange payment.
      </div>
    )
  }

  return (
    <div className="mt-3 card-elevated p-3">
      <p className="text-xs font-medium" style={{ color: 'var(--ink-soft)' }}>
        🌟 Get more eyes on this listing
      </p>
      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
        Featured listings sort to the top of Browse and show a badge — $5/week, billed manually for now.
      </p>
      <button
        onClick={submit}
        disabled={submitting}
        className="pressable mt-2 text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-60"
        style={{ background: 'var(--forest)', color: 'white' }}
      >
        {submitting ? 'Sending…' : 'Request to be featured'}
      </button>
    </div>
  )
}
