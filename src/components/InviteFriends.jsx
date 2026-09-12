import { useEffect, useState } from 'react'
import { fetchReferralCount, fetchPioneerReferralCount } from '../lib/profiles'
import { getReferralBadge, getPioneerBadge } from '../lib/badges'
import { shareLink } from '../lib/share'
import { useToast } from '../context/ToastContext'

export default function InviteFriends({ userId }) {
  const toast = useToast()
  const [count, setCount] = useState(null)
  const [pioneerCount, setPioneerCount] = useState(0)

  useEffect(() => {
    fetchReferralCount(userId)
      .then(setCount)
      .catch((err) => console.error('Failed to load referral count', err))
    fetchPioneerReferralCount()
      .then(setPioneerCount)
      .catch((err) => console.error('Failed to load pioneer referral count', err))
  }, [userId])

  const inviteLink = `${window.location.origin}${window.location.pathname}?ref=${userId}`
  const referralBadge = getReferralBadge(count ?? 0)
  const pioneerBadge = getPioneerBadge(pioneerCount)

  const share = async () => {
    try {
      const result = await shareLink({
        url: inviteLink,
        title: 'Join me on Plates',
        text: "I'm on Plates, a marketplace for homemade food from neighbors — join me?",
      })
      if (result === 'copied') toast.success('Invite link copied!')
    } catch (err) {
      console.error('Failed to share invite link', err)
      toast.error('Could not share that — try again.')
    }
  }

  return (
    <div className="card-elevated p-3 mb-3">
      <p className="text-base font-bold" style={{ color: 'var(--forest-dark)' }}>
        🎉 Invite your neighbors
      </p>
      <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
        Share your link — the more neighbors on Plates, the more food nearby.
        {count != null && count > 0 && (
          <span className="block mt-1 font-medium" style={{ color: 'var(--forest-dark)' }}>
            {count} {count === 1 ? 'neighbor has' : 'neighbors have'} joined from your invite so far.
          </span>
        )}
        {pioneerCount > 0 && (
          <span className="block mt-1 font-medium" style={{ color: 'var(--forest-dark)' }}>
            🧭 {pioneerCount} of your invites brought food to a neighborhood that didn't have any yet.
          </span>
        )}
      </p>
      {(referralBadge || pioneerBadge) && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {referralBadge && (
            <span
              className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--mustard-soft)', color: 'var(--mustard-deep)' }}
            >
              {referralBadge.icon} {referralBadge.label}
            </span>
          )}
          {pioneerBadge && (
            <span
              className="inline-block text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ background: 'var(--forest-soft)', color: 'var(--forest-dark)' }}
            >
              {pioneerBadge.icon} {pioneerBadge.label}
            </span>
          )}
        </div>
      )}
      <button
        onClick={share}
        className="pressable mt-2.5 text-xs px-3 py-1.5 rounded-full border block"
        style={{ borderColor: 'var(--forest)', color: 'var(--forest-dark)' }}
      >
        Share invite link
      </button>
    </div>
  )
}
