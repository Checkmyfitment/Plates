import Placeholder from './Placeholder'

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export default function NotificationsScreen({ notifications, onBack, onOpen }) {
  return (
    <div className="pb-4">
      <div className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back"
          className="pressable text-lg p-2 -m-2 rounded-full hover:bg-[var(--paper-dim)] transition-colors"
          style={{ color: 'var(--forest-dark)' }}
        >
          ←
        </button>
        <h2 className="font-display text-xl" style={{ color: 'var(--forest-dark)' }}>
          Notifications
        </h2>
      </div>

      {notifications.length === 0 ? (
        <div className="px-5">
          <Placeholder
            compact
            icon="🔔"
            title="No notifications yet"
            body="Follow a cuisine from your profile to hear about new listings."
          />
        </div>
      ) : (
        <div className="px-5 flex flex-col gap-2">
          {notifications.map((n) => (
            <button key={n.id} onClick={() => onOpen(n)} className="pressable text-left card-elevated p-3.5 text-sm">
              <p>{n.message}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--ink-soft)' }}>
                {timeAgo(n.createdAt)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
