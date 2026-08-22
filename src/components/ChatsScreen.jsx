import Placeholder from './Placeholder'

function ChatRowSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl p-3"
      style={{ background: 'color-mix(in srgb, var(--card) 60%, transparent)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="skeleton w-11 h-11 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1 flex flex-col gap-1.5">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-3 w-1/2" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
  )
}

export default function ChatsScreen({ chats, loading, onSelect }) {
  if (loading) {
    return (
      <div className="px-5 pb-4 flex flex-col gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <ChatRowSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (chats.length === 0) {
    return <Placeholder icon="✉" title="No messages yet" body="Message a seller to coordinate pickup." />
  }

  return (
    <div className="px-5 pb-4 flex flex-col gap-2">
      {chats.map((c) => {
        const last = c.messages[c.messages.length - 1] ?? { from: 'seller', text: 'Say hello!' }
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className="text-left flex items-center gap-3 rounded-2xl p-3"
            style={{ background: 'color-mix(in srgb, var(--card) 60%, transparent)', boxShadow: 'var(--shadow-card)' }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 overflow-hidden"
              style={{ background: c.bg }}
            >
              {c.photoUrl ? (
                <img src={c.photoUrl} alt={c.listingTitle} className="w-full h-full object-cover" />
              ) : (
                c.photo
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight truncate" style={{ fontWeight: c.unreadCount > 0 ? 700 : 500 }}>
                {c.seller}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--ink-soft)' }}>
                {c.listingTitle}
              </p>
              <p
                className="text-xs mt-0.5 truncate"
                style={{ color: c.unreadCount > 0 ? 'var(--ink)' : 'var(--ink-soft)', fontWeight: c.unreadCount > 0 ? 600 : 400 }}
              >
                {last.from === 'me' ? 'You: ' : ''}
                {last.text}
              </p>
            </div>
            {c.unreadCount > 0 && (
              <span
                className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center leading-none"
                style={{ background: 'var(--plum)', color: 'white' }}
              >
                {c.unreadCount > 9 ? '9+' : c.unreadCount}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
