import { useState } from 'react'
import { submitReport } from '../lib/reports'

const reasons = [
  'Safety incident (theft, threats, or something happened in person)',
  'Food safety concern',
  'Inaccurate listing (photo, price, or description)',
  'Spam or scam',
  'Inappropriate behavior',
  'Something else',
]

export default function ReportModal({ reporterId, listingId, reportedUserId, title, onClose }) {
  const [reason, setReason] = useState(reasons[0])
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await submitReport({ reporterId, listingId, reportedUserId, reason, details })
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5"
        style={{ background: 'var(--paper)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-2">✅</div>
            <h3 className="font-display text-lg" style={{ color: 'var(--forest-dark)' }}>
              Thanks for letting us know
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--ink-soft)' }}>
              We'll take a look. This doesn't notify the other person.
            </p>
            <button
              onClick={onClose}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 active:opacity-80 transition-opacity"
              style={{ background: 'var(--forest)', color: 'white' }}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <h3 className="font-display text-lg" style={{ color: 'var(--forest-dark)' }}>
              {title ?? 'Report this listing'}
            </h3>
            <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>
              Let us know what's wrong — reports are private and don't notify the other person.
            </p>
            <div
              className="rounded-xl border p-2.5 text-xs leading-relaxed"
              style={{ borderColor: 'var(--plum)', background: 'var(--plum-soft)', color: 'var(--plum)' }}
            >
              If you're in immediate danger, call 911 first. Reporting here doesn't contact
              emergency services — it lets our team review the account, which can take time.
            </div>

            <select value={reason} onChange={(e) => setReason(e.target.value)} className="field">
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any extra details (optional)"
              className="field"
              rows={3}
            />

            {error && (
              <p className="text-xs" style={{ color: 'var(--plum)' }}>
                {error}
              </p>
            )}

            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border"
                style={{ borderColor: 'var(--rule)', color: 'var(--ink-soft)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium disabled:opacity-60 hover:opacity-90 active:opacity-80 transition-opacity"
                style={{ background: 'var(--plum)', color: 'white' }}
              >
                {busy ? 'Sending…' : 'Submit report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
