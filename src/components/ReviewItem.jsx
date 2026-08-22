import { useState } from 'react'
import { replyToReview } from '../lib/reviews'
import { useToast } from '../context/ToastContext'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.round(diffMs / 86400000)
  if (days < 1) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 30) return `${days} days ago`
  const months = Math.round(days / 30)
  return `${months} month${months === 1 ? '' : 's'} ago`
}

// `isSeller` — whether the person viewing this review is the seller it was
// left for, i.e. the only person allowed to reply to it
export default function ReviewItem({ review, isSeller }) {
  const toast = useToast()
  const [sellerReply, setSellerReply] = useState(review.sellerReply)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState(review.sellerReply || '')
  const [busy, setBusy] = useState(false)

  const submitReply = async () => {
    setBusy(true)
    try {
      await replyToReview(review.id, replyText)
      const trimmed = replyText.trim() || null
      setSellerReply(trimmed)
      setReplying(false)
      toast.success(trimmed ? 'Reply posted.' : 'Reply removed.')
    } catch (err) {
      console.error('Failed to save reply', err)
      toast.error('Could not save that — try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card-elevated p-3">
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium overflow-hidden shrink-0"
          style={{ background: 'var(--paper-dim)', color: 'var(--ink-soft)' }}
        >
          {review.reviewerAvatar ? (
            <img src={review.reviewerAvatar} alt={review.reviewerName} className="w-full h-full object-cover" />
          ) : (
            review.reviewerName.charAt(0).toUpperCase()
          )}
        </div>
        <p className="text-xs font-medium">{review.reviewerName}</p>
        <span className="text-xs" style={{ color: 'var(--ink-soft)' }}>
          · ★ {review.rating} · {timeAgo(review.createdAt)}
        </span>
      </div>

      {review.comment && <p className="text-sm mt-1.5 leading-relaxed">{review.comment}</p>}

      {sellerReply && !replying && (
        <div className="mt-2 pl-2.5 border-l-2" style={{ borderColor: 'var(--forest)' }}>
          <p className="text-[11px] font-medium" style={{ color: 'var(--forest-dark)' }}>
            Seller reply
          </p>
          <p className="text-xs mt-0.5 leading-relaxed">{sellerReply}</p>
          {isSeller && (
            <button
              onClick={() => {
                setReplyText(sellerReply)
                setReplying(true)
              }}
              className="pressable text-[11px] mt-1 underline"
              style={{ color: 'var(--ink-soft)' }}
            >
              Edit reply
            </button>
          )}
        </div>
      )}

      {isSeller && !sellerReply && !replying && (
        <button
          onClick={() => setReplying(true)}
          className="pressable text-xs font-medium mt-2"
          style={{ color: 'var(--forest-dark)' }}
        >
          + Reply
        </button>
      )}

      {isSeller && replying && (
        <div className="mt-2">
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Reply to this review — visible to everyone"
            className="field resize-none text-xs"
            autoFocus
          />
          <div className="flex gap-2 mt-1.5">
            <button
              onClick={submitReply}
              disabled={busy}
              className="pressable text-xs px-3 py-1 rounded-full font-medium disabled:opacity-60"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              {busy ? 'Saving…' : 'Save reply'}
            </button>
            <button
              onClick={() => {
                setReplying(false)
                setReplyText(sellerReply || '')
              }}
              disabled={busy}
              className="pressable text-xs px-3 py-1 rounded-full border disabled:opacity-60"
              style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
