import { useEffect, useState } from 'react'
import { fetchReferralCount } from '../lib/profiles'
import { getReferralBadge } from '../lib/badges'
import { useToast } from '../context/ToastContext'

export default function InviteFriends({ userId }) {
  const toast = useToast()
  const [count, setCount] = useState(null)

  useEffect(() => {
    fetchReferralCount(userId)
      .then(setCount)
      .catch((err) => console.error('Failed to load referral count', err))
  }, [userId])

  const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`
  const referralBadge = getReferralBadge(count ?? 0)

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      toast.success('Invite link copied!')
    } catch (err) {
      console.error('Failed to copy invite link', err)
      toast.error('Could not copy the link — copy it manually.')
    }
  }

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-sm font-medium" style={{ color: 'var(--forest-dark)' }}>
        🎉 Invite your neighbors
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        Share your link — the more neighbors on Plates, the more food nearby.
        {count != null && count > 0 && (
          <span className="block mt-1 font-medium" style={{ color: 'var(--forest-dark)' }}>
            {count} {count === 1 ? 'neighbor has' : 'neighbors have'} joined from your invite so far.
          </span>
        )}
      </p>
      {referralBadge && (
        <span
          className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium mt-2"
          style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}
        >
          {referralBadge.icon} {referralBadge.label}
        </span>
      )}
      <button
        onClick={copyLink}
        className="pressable mt-2.5 text-xs px-3 py-1.5 rounded-full border block"
        style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
      >
        Copy invite link
      </button>
    </div>
  )
}
